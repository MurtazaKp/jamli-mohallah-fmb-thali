import { getSheetsClient } from "@/app/lib/googleSheets";
import { NextRequest, NextResponse } from "next/server";

// 🔤 Convert column index → letter (0 → A, 1 → B, ...)
const getColumnLetter = (index: number) => {
  let letter = "";
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
};

export async function POST(req: NextRequest) {
  try {
    // 🕒 IST time check
    const now = new Date();
    const istTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    // ⛔ Block before 10 AM and after 8 PM
    const hours = istTime.getHours();
    if (hours < 10 || hours >= 20) {
      return NextResponse.json(
        { error: "Thali update allowed only between 10 AM and 8 PM" },
        { status: 403 }
      );
    }

    const { type, area, its } = await req.json();

    if (!type || !area || !its) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    // ✅ Decide status
    const status = type === "start" ? "" : "STOP";

    // 🔹 STEP 1: Get headers (ROW 2 ✅)
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID!,
      range: `'${area}'!2:2`,
    });

    const headers = (headerRes.data.values?.[0] || []).map((h: string) =>
      h.toLowerCase().trim()
    );

    // 🔍 Find columns dynamically
    const itsColIndex = headers.findIndex((col) =>
      col.includes("its")
    );
    const statusColIndex = headers.findIndex((col) =>
      col.includes("status")
    );
    const updatedAtColIndex = headers.findIndex((col) =>
      col.includes("lastupdatedat")
    );

    if (itsColIndex === -1 || statusColIndex === -1) {
      return NextResponse.json(
        { error: "Required columns not found" },
        { status: 500 }
      );
    }

    // 🔹 STEP 2: Get data rows (ROW 3 onwards ✅)
    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID!,
      range: `'${area}'!A3:Z`,
    });

    const rows = dataRes.data.values || [];

    const inputITS = String(its).trim();

    // 🔍 Find row
    const rowIndex = rows.findIndex(
      (row) =>
        row &&
        String(row[itsColIndex] || "").trim() === inputITS
    );

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 🔹 STEP 3: Convert column index → letter
    const columnLetter = getColumnLetter(statusColIndex);

    // 🔥 IMPORTANT: actual row = index + 3 (since data starts at row 3)
    const actualRow = rowIndex + 3;

    // 🔹 STEP 4: Update cells
    const timestamp = istTime.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID!,
      range: `'${area}'!${columnLetter}${actualRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[status]],
      },
    });

    if (updatedAtColIndex !== -1) {
      const updatedAtLetter = getColumnLetter(updatedAtColIndex);
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SHEET_ID!,
        range: `'${area}'!${updatedAtLetter}${actualRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[timestamp]],
        },
      });
    }

    return NextResponse.json({
      message: "Updated successfully",
      area,
      its: inputITS,
      status,
    });

  } catch (error) {
    console.error("UPDATE ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}