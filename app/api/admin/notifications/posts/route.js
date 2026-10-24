import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { getPostsPage } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const query = (searchParams.get("q") || "").trim().slice(0, 100);
    if (!Number.isSafeInteger(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page." }, { status: 400 });
    }

    const result = await getPostsPage({ page, limit: 50, q: query });
    return NextResponse.json({
      items: result.items.map(({ routeName, title, imageLink, description }) => ({
        routeName,
        title,
        imageLink,
        description
      })),
      page: result.page,
      hasMore: result.hasMore
    }, {
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch (error) {
    console.error("Failed to load notification video options:", error);
    return NextResponse.json({ error: "Unable to load videos." }, { status: 500 });
  }
}
