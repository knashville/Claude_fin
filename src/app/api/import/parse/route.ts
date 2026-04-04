import { NextRequest, NextResponse } from "next/server";
import { parseCSV, guessColumnMapping } from "@/lib/csv-parser";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const { headers, rows } = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
  }

  const suggestedMapping = guessColumnMapping(headers);

  return NextResponse.json({
    headers,
    rowCount: rows.length,
    sampleRows: rows.slice(0, 5),
    suggestedMapping,
  });
}
