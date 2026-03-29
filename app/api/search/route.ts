import { getSheetsClient } from "@/app/lib/googleSheets";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { its, phone } = await req.json();

    if (!its || !phone) {
      return NextResponse.json(
        { error: "ITS and Phone required" },
        { status: 400 }
      );
    }

    // ✅ Normalize phone (last 10 digits only)
    const normalizePhone = (num: string) =>
      num.replace(/\D/g, "").slice(-10);

    const inputPhone = normalizePhone(phone);

    const sheets = await getSheetsClient();

    // ✅ Get all sheet names
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID!,
    });

    const sheetNames =
      meta.data.sheets?.map((s: any) => s.properties.title) || [];

    // 🚀 Fetch all sheets in parallel
    const sheetData = await Promise.all(
      sheetNames.map(async (sheetName) => {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SHEET_ID!,
          range: `${sheetName}!A1:Z`,
        });

        return {
          sheetName,
          rows: res.data.values || [],
        };
      })
    );

    // 🔍 Search in memory
    for (const sheet of sheetData) {
      const { sheetName, rows } = sheet;

      if (!rows.length) continue;

      const headers = rows[0].map((h: string) =>
        h.toLowerCase().trim()
      );

      const itsColIndex = headers.indexOf("its");
      const nameColIndex = headers.findIndex((h) =>
        h.includes("name")
      );
      const phoneColIndex = headers.findIndex((h) =>
        h.includes("mobile")
      );
      const statusColIndex = headers.findIndex((h) =>
        h.includes("thali")
      );
      const addressColIndex = headers.findIndex((h) =>
        h.includes("address")
      );

      if (itsColIndex === -1 || phoneColIndex === -1) continue;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        const sheetITS = String(row[itsColIndex] || "");
        const sheetPhone = normalizePhone(
          String(row[phoneColIndex] || "")
        );

        // ✅ MATCH ITS + PHONE
        if (sheetITS === String(its) && sheetPhone === inputPhone) {
          const rawStatus = row[statusColIndex];
          const status =
            rawStatus === "STOP" ? "STOP" : "";

          return NextResponse.json({
            its,
            name: row[nameColIndex] || "",
            phone: row[phoneColIndex] || "",
            address:
              addressColIndex !== -1
                ? row[addressColIndex] || ""
                : "",
            area: sheetName, // ✅ IMPORTANT
            status,
          });
        }
      }
    }

    return NextResponse.json(
      { error: "User not found or phone mismatch" },
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