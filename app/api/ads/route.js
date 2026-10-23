import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { getAdSettings } from "@/lib/adSettings";
import { connectDB } from "@/lib/db";
import SiteAdSettings from "@/models/SiteAdSettings";

export const dynamic = "force-dynamic";

const AD_TYPES = new Set(["popunder", "socialBar", "videoRedirect"]);

export async function GET() {
  try {
    return NextResponse.json(await getAdSettings(), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Failed to load ad settings:", error);
    return NextResponse.json({ error: "Unable to load ad settings." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (
      !body ||
      !AD_TYPES.has(body.type) ||
      typeof body.enabled !== "boolean"
    ) {
      return NextResponse.json({ error: "Invalid ad setting." }, { status: 400 });
    }

    await connectDB();
    const settings = await SiteAdSettings.findOneAndUpdate(
      { key: "site" },
      { $set: { [body.type]: body.enabled } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    return NextResponse.json({
      popunder: settings.popunder,
      socialBar: settings.socialBar,
      videoRedirect: settings.videoRedirect
    });
  } catch (error) {
    console.error("Failed to update ad settings:", error);
    return NextResponse.json({ error: "Unable to update ad settings." }, { status: 500 });
  }
}
