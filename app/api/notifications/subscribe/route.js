import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import PushSubscriptionRecord from "@/models/PushSubscription";

export const dynamic = "force-dynamic";

function decodeKey(value, expectedLength) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
  try {
    return Buffer.from(value, "base64url").length === expectedLength;
  } catch {
    return false;
  }
}

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`push-subscribe:${ip}`, 60_000, 10)) {
    return NextResponse.json({ ok: false, error: "Too many subscription requests." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const endpoint =
      typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
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
      endpoint.length > 2048 ||
      !decodeKey(body?.keys?.p256dh, 65) ||
      !decodeKey(body?.keys?.auth, 16) ||
      (body.expirationTime != null &&
        (!Number.isFinite(body.expirationTime) || body.expirationTime <= 0))
    ) {
      return NextResponse.json({ ok: false, error: "Invalid push subscription." }, { status: 400 });
    }

    await connectDB();
    await PushSubscriptionRecord.findOneAndUpdate(
      { endpoint },
      {
        $set: {
          keys: {
            p256dh: body.keys.p256dh,
            auth: body.keys.auth
          },
          expirationTime: body.expirationTime ?? null
        }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ ok: true });
    }
    console.error("Failed to save push subscription:", error);
    return NextResponse.json({ ok: false, error: "Subscription could not be saved." }, { status: 500 });
  }
}
