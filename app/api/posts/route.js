// /api/posts - AJAX pagination for infinite scroll (cached via Next Data Cache)
import { NextResponse } from "next/server";
import { getPostsPage } from "@/lib/data";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`posts:${ip}`, 60_000, 120)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const rawPage = searchParams.get("page") || "1";
    const rawLimit = searchParams.get("limit") || "10";
    const page = Number.parseInt(rawPage, 10);
    const limit = Number.parseInt(rawLimit, 10);
    const q = (searchParams.get("q") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const sort = searchParams.get("sort") || "latest";

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 1000 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50 ||
      q.length > 100 ||
      category.length > 100 ||
      !["latest", "popular"].includes(sort)
    ) {
      return NextResponse.json({ error: "Invalid pagination or filter parameters." }, { status: 400 });
    }

    const data = await getPostsPage({ page, limit, q, category, sort });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}