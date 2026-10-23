import { NextResponse } from "next/server";
import { createECDH } from "node:crypto";
import webpush from "web-push";
import { getAdmin } from "@/lib/adminAuth";
import { connectDB } from "@/lib/db";
import { rateLimit, sanitizeString } from "@/lib/security";
import NotificationBroadcast from "@/models/NotificationBroadcast";
import PushSubscriptionRecord from "@/models/PushSubscription";

export const dynamic = "force-dynamic";

function hasMatchingVapidKeys(publicKey, privateKey) {
  try {
    const publicKeyBytes = Buffer.from(publicKey, "base64url");
    const privateKeyBytes = Buffer.from(privateKey, "base64url");
    if (
      publicKeyBytes.length !== 65 ||
      publicKeyBytes[0] !== 4 ||
      privateKeyBytes.length !== 32
    ) {
      return false;
    }

    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(privateKeyBytes);
    return ecdh.getPublicKey(null, "uncompressed").equals(publicKeyBytes);
  } catch {
    return false;
  }
}

export async function POST(req) {
  let broadcast = null;
  let sent = 0;
  let failed = 0;
  let removedExpired = 0;
  const failureStatusCodes = {};

  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`push-send:${ip}`, 60_000, 5)) {
      return NextResponse.json({ ok: false, error: "Too many notification sends." }, { status: 429 });
    }

    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      return NextResponse.json({ ok: false, error: "Web Push VAPID keys are not configured." }, { status: 503 });
    }
    if (!hasMatchingVapidKeys(publicKey, privateKey)) {
      return NextResponse.json(
        { ok: false, error: "Web Push VAPID keys are invalid or do not match. Configure a matching key pair and rebuild the site." },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => null);
    const title = sanitizeString(body?.title || "", "").slice(0, 80);
    const message = sanitizeString(body?.body || "", "").slice(0, 200);
    if (!body || !title || !message) {
      return NextResponse.json({ ok: false, error: "A notification title and message are required." }, { status: 400 });
    }

    const configuredSite = process.env.NEXT_PUBLIC_SITE_URL;
    const siteOrigin = configuredSite
      ? new URL(configuredSite).origin
      : new URL(req.url).origin;

    const requestedUrl = typeof body.url === "string" ? body.url.trim() : "/";
    let destination;
    try {
      destination = new URL(requestedUrl || "/", siteOrigin);
    } catch {
      destination = null;
    }
    if (
      !destination ||
      !["http:", "https:"].includes(destination.protocol) ||
      destination.username ||
      destination.password ||
      destination.href.length > 2048
    ) {
      return NextResponse.json(
        { ok: false, error: "Enter an HTTP or HTTPS link, or a path on this site." },
        { status: 400 }
      );
    }

    const requestedImage = typeof body.imageUrl === "string"
      ? body.imageUrl.trim()
      : "";
    let imageUrl = `${siteOrigin}/favicon.ico`;
    if (requestedImage) {
      let image;
      if (requestedImage.length > 2048) {
        return NextResponse.json({ ok: false, error: "Image URL is too long." }, { status: 400 });
      }
      try {
        image = new URL(requestedImage, siteOrigin);
      } catch {
        image = null;
      }
      if (
        !image ||
        (image.protocol !== "https:" && image.origin !== siteOrigin) ||
        image.username ||
        image.password
      ) {
        return NextResponse.json({ ok: false, error: "Enter a valid image URL." }, { status: 400 });
      }
      imageUrl = image.href;
    }

    const contactEmail = process.env.WEB_PUSH_CONTACT_EMAIL || "admin@p9x9.com";
    webpush.setVapidDetails(`mailto:${contactEmail}`, publicKey, privateKey);

    await connectDB();
    const total = await PushSubscriptionRecord.countDocuments();
    broadcast = await NotificationBroadcast.create({
      title,
      body: message,
      imageUrl,
      url: destination.href,
      total
    });

    const expiredEndpoints = [];
    const payload = JSON.stringify({
      title,
      body: message,
      icon: imageUrl,
      image: imageUrl,
      url: destination.href
    });

    const cursor = PushSubscriptionRecord.find({})
      .select("endpoint keys")
      .lean()
      .cursor({ batchSize: 50 });
    let batch = [];

    async function sendBatch(subscriptions) {
      const results = await Promise.allSettled(
        subscriptions.map((subscription) =>
          webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys
            },
            payload,
            { TTL: 3600 }
          )
        )
      );

      results.forEach((result, resultIndex) => {
        if (result.status === "fulfilled") {
          sent += 1;
          return;
        }

        failed += 1;
        const statusCode = result.reason?.statusCode;
        const statusKey = Number.isInteger(statusCode) ? String(statusCode) : "unknown";
        failureStatusCodes[statusKey] = (failureStatusCodes[statusKey] || 0) + 1;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(subscriptions[resultIndex].endpoint);
        } else {
          console.error("Push delivery failed:", statusKey);
        }
      });
    }

    for await (const subscription of cursor) {
      batch.push(subscription);
      if (batch.length === 10) {
        await sendBatch(batch);
        batch = [];
      }
    }
    if (batch.length) await sendBatch(batch);

    if (expiredEndpoints.length) {
      await PushSubscriptionRecord.deleteMany({
        endpoint: { $in: expiredEndpoints }
      });
      removedExpired = expiredEndpoints.length;
    }

    broadcast.sent = sent;
    broadcast.failed = failed;
    broadcast.removedExpired = removedExpired;
    broadcast.failureStatusCodes = failureStatusCodes;
    broadcast.status = failed > 0 && sent === 0 ? "failed" : "completed";
    await broadcast.save();

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      total,
      removedExpired,
      failureStatusCodes,
      broadcastId: broadcast._id.toString()
    });
  } catch (error) {
    console.error("Failed to send push notifications:", error);
    if (broadcast) {
      try {
        broadcast.sent = sent;
        broadcast.failed = Math.max(failed, broadcast.total - sent);
        broadcast.removedExpired = removedExpired;
        broadcast.failureStatusCodes = failureStatusCodes;
        broadcast.status = "failed";
        await broadcast.save();
      } catch (saveError) {
        console.error("Failed to save notification delivery status:", saveError);
      }
    }
    return NextResponse.json({ ok: false, error: "Notification delivery failed." }, { status: 500 });
  }
}
