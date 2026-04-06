import { NextResponse } from "next/server";
import { getTellerAppId, getTellerEnvironment } from "@/lib/teller";

export async function GET() {
  return NextResponse.json({
    appId: getTellerAppId(),
    environment: getTellerEnvironment(),
  });
}
