import { getSheetsClient } from "@/app/lib/googleSheets";
import { NextResponse } from "next/server";

const SHEETS = [
  "Taha",
  "Zaini",
  "Taheri",
  "Mufaddal",
  "Hakimi",
  "Najmi",
  "Ezzi",
  "Saifee",
  "Burhani",
];

export async function GET() {
  try {
    const now = new Date();

    // ✅ Correct IST hour using Intl.DateTimeFormat (avoids locale string parsing issues)
    const istHour = Number(
      new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        hour12: false,
      }).format(now)
    );

    if (istHour < 20) {
      console.log("Update skipped: Not after 8 PM IST yet.");
      return NextResponse.json({
        success: false,
        message: "Updates allowed only after 8 PM IST",
      });
    }

    // ✅ Today's date in IST
    const today = now.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const sheets = await getSheetsClient();

    // ✅ Check Summary sheet FIRST — before reading all individual sheets
    const summaryRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID!,
      range: "Summary!A:B",
    });

    const existingRows: string[][] = summaryRes.data.values || [];
    // Skip row 0 (header), search from row 1 onwards
    const todayRowIndex = existingRows.findIndex(
      (row, i) => i > 0 && String(row[0] ?? "").trim() === today
    );
    const todayRow = existingRows[todayRowIndex];
    const todayCount = todayRow?.[1];

    // ✅ If today's date exists AND has a non-empty count — stop here
    if (todayRowIndex !== -1 && todayCount !== undefined && todayCount !== "") {
      console.log("Today's count already saved. No changes made.");
      return NextResponse.json({
        success: false,
        alreadySaved: true,
        message: "Today's count has already been saved",
        totalActive: Number(todayCount),
      });
    }

    // --- Count active tiffins across all sheets ---
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID!,
    });
    const actualSheetNames =
      meta.data.sheets?.map((s) => s.properties?.title ?? "") ?? [];

    let totalActive = 0;

    for (const sheetName of SHEETS) {
      const matchedName = actualSheetNames.find(
        (name) => name.trim().toLowerCase() === sheetName.trim().toLowerCase()
      );

      if (!matchedName) {
        console.log(`Sheet not found: "${sheetName}"`);
        continue;
      }

      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SHEET_ID!,
          range: `${matchedName}!A1:Z1000`,
        });

        const rows = res.data.values || [];
        if (rows.length === 0) continue;

        const headers = rows[0].map((h: string) => h.toLowerCase().trim());
        const itsColIndex = headers.findIndex((col: string) => col === "its");
        const statusColIndex = headers.findIndex((col: string) =>
          col.includes("thali")
        );

        if (statusColIndex === -1) {
          console.log(`No thali column in: ${matchedName}`);
          continue;
        }

        const activeCount = rows.slice(1).filter((row) => {
          const itsVal = String(row?.[itsColIndex] ?? "").trim();
          if (!itsVal) return false;
          const status = String(row?.[statusColIndex] ?? "").trim().toUpperCase();
          return status === "ACTIVE";
        }).length;

        console.log(`${matchedName}: ${activeCount} active`);
        totalActive += activeCount;
      } catch (err) {
        console.log(`Error reading sheet: ${sheetName}`, err);
      }
    }

    console.log("=== Total Active:", totalActive, "===");

    // ✅ Write to Summary: update existing row (empty count) or append new row
    if (todayRowIndex !== -1) {
      // Row exists but count was empty — fill it in
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SHEET_ID!,
        range: `Summary!B${todayRowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[totalActive]] },
      });
      console.log("Updated today's empty count in Summary sheet.");
    } else {
      // No row for today — append
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SHEET_ID!,
        range: "Summary!A2:B",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[today, totalActive]] },
      });
      console.log("Added today's count to Summary sheet.");
    }

    return NextResponse.json({ success: true, totalActive });
  } catch (error) {
    console.error("tiffin-count error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}