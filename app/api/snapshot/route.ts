import { NextResponse } from "next/server";
import { google } from "googleapis";

async function createDailySnapshot() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT!),
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });

  const today = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).replace(/\//g, "-");

  const folderId = process.env.GOOGLE_FOLDER_ID!;
  const sourceSheetId = process.env.SHEET_ID!;

  // 1. Check if snapshot already exists for today
  const existing = await drive.files.list({
    q: `name='${today} - Tiffin Snapshot' and '${folderId}' in parents and trashed=false`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return { success: false, message: "Snapshot already exists for today." };
  }

  // 2. Create a NEW blank Spreadsheet in your 2TB folder
  // Creating a new file and writing to it often bypasses the strict 'copy' quota
  const newFile = await drive.files.create({
    requestBody: {
      name: `${today} - Tiffin Snapshot`,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [folderId],
    },
    supportsAllDrives: true,
  });

  const newFileId = newFile.data.id!;

  // 3. Get all Sheet names (Zaini, Taheri, Mufaddal, etc.) from Source
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: sourceSheetId });
  const sheetNames = metadata.data.sheets?.map(s => s.properties?.title) || [];

  // 4. Loop through each tab and transfer data
  for (const name of sheetNames) {
    if (!name) continue;

    // Fetch data from the specific tab
    const rangeData = await sheets.spreadsheets.values.get({
      spreadsheetId: sourceSheetId,
      range: `${name}!A:K`, 
    });

    if (!rangeData.data.values) continue;

    // Create the tab in the new file if it's not the default "Sheet1"
    if (name !== "Sheet1") {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: newFileId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: name } } }],
        },
      });
    }

    // Paste the data into the new file
    await sheets.spreadsheets.values.update({
      spreadsheetId: newFileId,
      range: `${name}!A1`,
      valueInputOption: "USER_ENTERED", 
      requestBody: {
        values: rangeData.data.values,
      },
    });
  }

  return {
    success: true,
    fileId: newFileId,
    url: `https://docs.google.com/spreadsheets/d/${newFileId}`,
  };
}

export async function GET() {
  try {
    const now = new Date();
    const istHour = parseInt(new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(now));

    // ✅ Time restriction: Only after 8 PM (20:00) IST
    if (istHour < 20) {
      return NextResponse.json({
        success: false,
        message: "Snapshots are only allowed after 8 PM IST.",
        currentHour: `${istHour}:00 IST`
      });
    }

    const result = await createDailySnapshot();
    return NextResponse.json(result);

  } catch (err: any) {
    console.error("Snapshot Error:", err);
    
    // Detailed error reporting
    const errorMsg = err.response?.data?.error?.message || err.message;
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to create snapshot", 
        details: errorMsg 
      },
      { status: 500 }
    );
  }
}