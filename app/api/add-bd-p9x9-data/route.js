// /api/add-bd-p9x9-data - same as old shareDataController.createPostDesi
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { rateLimit, timingSafeEqual } from "@/lib/security";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-P9X9-Sync-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`add-bd-data:${ip}`, 60_000, 120)) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "Too many requests" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const syncKey = process.env.DATA_SYNC_API_KEY;
    if (
      syncKey &&
      !timingSafeEqual(req.headers.get("x-p9x9-sync-key") || "", syncKey)
    ) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await req.json().catch(() => ({}));

    if (!data.title || typeof data.title !== "string" || data.title.length > 500) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "A valid title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize the title before looking for an existing post.
    if (data.title) {
      data.title = data.title.toLowerCase();
    }

    // Convert the category list to an array.
    if (data.category) {
      data.category = data.category.split(",").map((c) => c.trim());
    }

    await connectDB();

    // Check whether the title already exists.
    const existingPost = await Post.findOne({ title: data.title });

    if (existingPost) {
      // Update the remaining fields without changing the title.
      Object.keys(data).forEach((key) => {
        if (key !== "title") {
          // The title must not be changed by this update.
          existingPost[key] = data[key];
        }
      });
      await existingPost.save();
    } else {
      // Create a new post when no matching title exists.
      await Post.create(data);
    }

    revalidateTag("posts");

    return new NextResponse(
      JSON.stringify({ success: true, message: "Data saved successfully", title: data.title }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new NextResponse(
      JSON.stringify({ success: false, message: "Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
