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
  "Transporter",
];

export async function POST(req: NextRequest) {
  try {
    const { its } = await req.json();
    const sheets = await getSheetsClient();

    for (const sheetName of SHEETS) {
      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SHEET_ID!,
          range: `'${sheetName}'!A1:Z`,
        });

        const rows = res.data.values || [];
        if (rows.length === 0) continue;

        const headers = rows[0].map((h: string) =>
          h.toLowerCase().trim()
        );

        // ✅ exact mapping for your sheet
        const itsColIndex = headers.findIndex((col) => col === "its");
        const nameColIndex = headers.findIndex((col) => col === "name");
        const phoneColIndex = headers.findIndex((col) =>
          col.includes("mobile")
        );
        const statusColIndex = headers.findIndex((col) =>
          col.includes("thali")
        );

        if (
          itsColIndex === -1 ||
          nameColIndex === -1 ||
          phoneColIndex === -1 ||
          statusColIndex === -1
        ) {
          console.log("Skipping:", sheetName, headers);
          continue;
        }

        const rowIndex = rows.findIndex(
          (row, index) =>
            index !== 0 &&
            row &&
            String(row[itsColIndex]) === String(its)
        );

        if (rowIndex !== -1) {
          const row = rows[rowIndex];

          const user: UserProps = {
            name: row[nameColIndex],
            its: row[itsColIndex],
            phone: row[phoneColIndex],
            status: row[statusColIndex] || "STOPPED",
            area: sheetName,
          };

          return NextResponse.json(user);
        }
      } catch (err) {
        console.log(`Error in sheet: ${sheetName}`, err);
      }
    }

    return NextResponse.json(
      { message: "User not found" },
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