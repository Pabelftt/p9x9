import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { checkUrlHealth } from "@/lib/linkCheck";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`link-check:${ip}`, 60_000, 20)) {
      return NextResponse.json({ ok: false, error: "Too many checks. Please wait before retrying." }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
    }
    const target = typeof body?.targetUrl === "string" ? body.targetUrl.trim() : "";

    if (!target || target.length > 2048) {
      return NextResponse.json({ ok: false, error: "A valid target URL is required." }, { status: 400 });
    }

    const result = await checkUrlHealth(target, { timeoutMs: 8000 });
    return NextResponse.json({ ok: result.ok, result, safe: result.safe });
  } catch (error) {
    console.error("Link check API error:", error);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
