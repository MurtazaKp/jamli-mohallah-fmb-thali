import { getSheetsClient } from "@/app/lib/googleSheets";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { type, area, rowIndex } = await req.json();
  const sheets = await getSheetsClient();

  const status = type === "start" ? "ACTIVE" : "STOPPED";

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID!,
    range: `'${area}'!K${rowIndex}`, // ✅ PERFECT
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[status]],
    },
  });

  return NextResponse.json({ message: "Updated successfully" });
}