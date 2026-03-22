import { getSheetsClient } from "@/app/lib/googleSheets";
import { UserProps } from "@/app/types";
import { NextRequest, NextResponse } from "next/server";

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
  "Transporter"
];

export async function POST(req: NextRequest) {
  const { its } = await req.json();
  const sheets = await getSheetsClient();

  for (const sheetName of SHEETS) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID!,
        range: `'${sheetName}'!A:K`,
      });

      const rows = res.data.values || [];

      const rowIndex = rows.findIndex(
        (row, index) =>
          index !== 0 && row && String(row[1]) === String(its)
      );

      if (rowIndex !== -1) {
        const row = rows[rowIndex];

        const user: UserProps = {
          name: row[2],
          its: row[1],
          phone: row[8],
          status: row[10] || "STOPPED",
          area: sheetName,
          rowIndex: rowIndex + 1, // ✅ ONLY this
        };

        return NextResponse.json(user);
      }
    } catch (err) {
      console.log(`Error in sheet: ${sheetName}`);
    }
  }

  return NextResponse.json({ message: "User not found" }, { status: 404 });
}