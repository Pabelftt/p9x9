// /api/admin/view/update - same as old adminController.updateView
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`video-view:${ip}`, 60_000, 120)) {
      return NextResponse.json({ success: false, message: "Too many requests" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { routeName } = body;

    if (!routeName) {
      return NextResponse.json(
        { success: false, message: "routeName is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const updated = await Post.findOneAndUpdate(
      { routeName: routeName.toLowerCase() },
      { $inc: { totalView: 1 } },
      { returnDocument: "after" }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      totalView: updated.totalView
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
