// /api/admin/add - same as old adminController.createPost (DB save + API sync)
import { NextResponse } from "next/server";
import axios from "axios";
import { revalidateTag } from "next/cache";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getAdmin } from "@/lib/adminAuth";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`admin-add:${ip}`, 60_000, 30)) {
      return NextResponse.json({ success: false, message: "Too many requests" }, { status: 429 });
    }

    const data = await req.json().catch(() => ({}));

    const { routeName, title, imageLink, videoLink, duration, description, category } = data;

    if (!routeName || !title || !imageLink || !videoLink || !description || !category) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    // normalize routeName
    if (data.routeName) {
      data.routeName = data.routeName.toLowerCase().trim();
    }

    await connectDB();

    // duplicate check
    const existingPost = await Post.findOne({ routeName: data.routeName });

    if (existingPost) {
      return NextResponse.json({
        success: false,
        message: "⚠ This routeName already exists"
      });
    }

    // category sanitize
    if (data.category) {
      data.category = data.category
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    }

    // =========================
    // STEP 1: SAVE DB FIRST
    // =========================
    const newPost = await Post.create(data);
    revalidateTag("posts");

    // =========================
    // STEP 2: API SYNC (wait until finish)
    // =========================
    let apiSuccess = false;
    let apiMessage = "API sync is not configured";
    const syncApiKey = process.env.P9X9_SYNC_API_KEY;

    if (syncApiKey) {
      try {
        await axios.post(
          "https://api.p9x9.com/add-movie",
          {
            id: newPost.routeName.replace(/^\//, ""),
            hadding: newPost.title,
            img: newPost.imageLink,
            play: newPost.videoLink
          },
          {
            headers: {
              "Content-Type": "application/json",
              "x-api-key": syncApiKey
            },
            timeout: 15000
          }
        );

        apiSuccess = true;
        apiMessage = "API Sync Success";
      } catch (apiError) {
        console.error("External post sync failed:", apiError?.message);
        apiMessage = "External API sync failed";
      }
    }

    // =========================
    // FINAL RESPONSE
    // =========================
    return NextResponse.json({
      success: true,
      message: "Post created successfully",
      apiSuccess,
      apiMessage
    });
  } catch (error) {
    console.error("Create Post Error:", error);

    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
