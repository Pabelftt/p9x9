import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { connectDB } from "@/lib/db";
import PushSubscriptionRecord from "@/models/PushSubscription";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const count = await PushSubscriptionRecord.countDocuments();
    return NextResponse.json(
      { count },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Failed to count notification subscriptions:", error);
    return NextResponse.json(
      { error: "Unable to load notification subscriber count." },
      { status: 500 }
    );
  }
}
