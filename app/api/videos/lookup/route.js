import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import Post from "@/models/Post";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`video-lookup:${ip}`, 60_000, 60)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const routeNames = Array.isArray(body?.routeNames)
      ? [...new Set(body.routeNames)]
      : null;

    if (
      !routeNames ||
      routeNames.length > 200 ||
      routeNames.some(
        (name) =>
          typeof name !== "string" ||
          name.length === 0 ||
          name.length > 200 ||
          /[\u0000-\u001f]/.test(name)
      )
    ) {
      return NextResponse.json({ error: "Invalid video list." }, { status: 400 });
    }

    await connectDB();
    const items = await Post.find({ routeName: { $in: routeNames } })
      .select("routeName title imageLink duration totalView createdAt")
      .lean();

    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        _id: item._id.toString(),
        formattedDate: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString()
          : ""
      }))
    });
  } catch (error) {
    console.error("Failed to load requested videos:", error);
    return NextResponse.json({ error: "Unable to load videos." }, { status: 500 });
  }
}
