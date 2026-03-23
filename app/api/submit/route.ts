import { getSheetsClient } from "@/app/lib/googleSheets";
import { NextRequest, NextResponse } from "next/server";


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
   
    const now = new Date();
    const istTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    if (istTime.getHours() >= 20) {
      return NextResponse.json(
        { error: "Thali update not allowed after 8 PM" },
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
    const status = type === "start" ? "ACTIVE" : "STOPPED";

    
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID!,
      range: `'${area}'!1:1`,
    });

    const headers = (headerRes.data.values?.[0] || []).map((h: string) =>
      h.toLowerCase().trim()
    );

  
    const itsColIndex = headers.findIndex((col) => col === "its");
    const statusColIndex = headers.findIndex((col) =>
      col.includes("thali")
    );

    if (itsColIndex === -1 || statusColIndex === -1) {
      return NextResponse.json(
        { error: "Required columns not found" },
        { status: 500 }
      );
    }

    // ✅ 3. Get rows
    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID!,
      range: `'${area}'!A2:Z`,
    });

    const rows = dataRes.data.values || [];

    // ✅ 4. Find row using ITS
    const rowIndex = rows.findIndex(
      (row) => row && String(row[itsColIndex]) === String(its)
    );

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ✅ 5. Convert column index → letter
    const columnLetter = getColumnLetter(statusColIndex);
    const actualRow = rowIndex + 2;

    // ✅ 6. Update Thali_Status
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID!,
      range: `'${area}'!${columnLetter}${actualRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[status]],
      },
    });

    return NextResponse.json({
      message: "Updated successfully",
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}