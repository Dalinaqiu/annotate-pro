import { NextResponse } from "next/server";

// TODO: trigger async export job and respond with tracking token
export async function POST() {
  return NextResponse.json({ status: "queued" });
}
