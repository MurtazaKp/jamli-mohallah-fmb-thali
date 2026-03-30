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

    // ✅ Normalize phone (last 10 digits)
    const normalizePhone = (num: string) =>
      num.replace(/\D/g, "").slice(-10);

    const inputPhone = normalizePhone(phone);
    const inputITS = String(its).trim();

    const sheets = await getSheetsClient();

    // ✅ Get all sheet names
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID!,
    });

    const sheetNames =
      meta.data.sheets?.map((s: any) => s.properties.title) || [];

    // ✅ Filter only valid data sheets (IMPORTANT)
    const validSheets = sheetNames.filter(
      (name: string) =>
        !["Totals", "Settings", "March"].includes(name)
    );

    // 🚀 Fetch all sheets in parallel
    const sheetData = await Promise.all(
      validSheets.map(async (sheetName) => {
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

      if (rows.length < 2) continue; // must have header + data

      // ✅ Header is on 2nd row (index 1)
      const headers = rows[1].map((h: string) =>
        h.toLowerCase().trim()
      );

      // 🔍 Flexible column detection
      const itsColIndex = headers.findIndex((h) =>
        h.includes("its")
      );
      const nameColIndex = headers.findIndex((h) =>
        h.includes("name")
      );
      const phoneColIndex = headers.findIndex((h) =>
        h.includes("mobile")
      );
      const statusColIndex = headers.findIndex((h) =>
        h.includes("status")
      );
      const addressColIndex = headers.findIndex((h) =>
        h.includes("address")
      );

      if (itsColIndex === -1 || phoneColIndex === -1) {
        // console.log("Skipping sheet:", sheetName);
        continue;
      }

      // 🔁 Loop from row index 2 (skip title + header)
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i] || [];

        const sheetITS = String(row[itsColIndex] || "").trim();
        const sheetPhone = normalizePhone(
          String(row[phoneColIndex] || "")
        );

        // ✅ MATCH ITS + PHONE
        if (sheetITS === inputITS && sheetPhone === inputPhone) {
          const rawStatus = row[statusColIndex] || "";
          const status =
            String(rawStatus).toUpperCase().trim() === "STOP"
              ? "STOP"
              : "";

          return NextResponse.json({
            its: inputITS,
            name:
              nameColIndex !== -1 ? row[nameColIndex] || "" : "",
            phone:
              phoneColIndex !== -1 ? row[phoneColIndex] || "" : "",
            address:
              addressColIndex !== -1
                ? row[addressColIndex] || ""
                : "",
            area: sheetName,
            status,
          });
        }
      }
    }

    // ❌ Not found
    return NextResponse.json(
      { error: "User not found or phone mismatch" },
      { status: 404 }
    );
  } catch (error) {
    console.error("API ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}