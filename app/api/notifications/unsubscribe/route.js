import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import PushSubscriptionRecord from "@/models/PushSubscription";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`push-unsubscribe:${ip}`, 60_000, 20)) {
    return NextResponse.json({ ok: false, error: "Too many subscription requests." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    let parsedEndpoint;
    try {
      parsedEndpoint = new URL(endpoint);
    } catch {
      parsedEndpoint = null;
    }
    if (
      !parsedEndpoint ||
      parsedEndpoint.protocol !== "https:" ||
      parsedEndpoint.username ||
      parsedEndpoint.password ||
      endpoint.length > 2048
    ) {
      return NextResponse.json({ ok: false, error: "Invalid subscription endpoint." }, { status: 400 });
    }

    await connectDB();
    await PushSubscriptionRecord.deleteOne({ endpoint });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to remove push subscription:", error);
    return NextResponse.json({ ok: false, error: "Subscription could not be removed." }, { status: 500 });
  }
}
