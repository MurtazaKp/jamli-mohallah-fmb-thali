import { getSheetsClient } from "@/app/lib/googleSheets";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { its } = await req.json();

    if (!its) {
      return NextResponse.json(
        { error: "ITS required" },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    // 🔥 AUTO FETCH SHEET NAMES (FIXED)
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID!,
    });

    const sheetNames =
      meta.data.sheets?.map((s: any) => s.properties.title) || [];

    for (const area of sheetNames) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID!,
        range: `${area}!A1:Z`, // ✅ FIXED (no quotes needed)
      });

      const rows = res.data.values || [];
      if (!rows.length) continue;

      const headers = rows[0].map((h: string) =>
        h.toLowerCase().trim()
      );

      const itsColIndex = headers.findIndex((h) => h === "its");
      const nameColIndex = headers.findIndex((h) =>
        h.includes("name")
      );
      const phoneColIndex = headers.findIndex((h) =>
        h.includes("mobile")
      );
      const statusColIndex = headers.findIndex((h) =>
        h.includes("thali")
      );

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        if (String(row[itsColIndex]) === String(its)) {
          const rawStatus = row[statusColIndex];

          // ✅ IMPORTANT LOGIC
          const status = rawStatus === "STOPPED" ? "STOPPED" : "";

          return NextResponse.json({
            its,
            name: row[nameColIndex],
            phone: row[phoneColIndex],
            area,
            status,
          });
        }
      }
    }

    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}