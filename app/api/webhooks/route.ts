import { NextResponse } from "next/server";

// TODO: implement webhook signature validation and routing
export async function POST() {
  return NextResponse.json({ received: true });
}
