// /api/admin/update/:id - same as old adminController.updatePost
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getAdmin } from "@/lib/adminAuth";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  try {
    const admin = await getAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`admin-update:${ip}`, 60_000, 30)) {
      return NextResponse.json({ success: false, message: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const data = await req.json().catch(() => ({}));
    data.category = data.category ? data.category.split(",") : [];

    await connectDB();
    await Post.findByIdAndUpdate(id, data);
    revalidateTag("posts");

    // relative Location: browsers resolve it against the current origin, so the
    // redirect stays on the real domain even behind a proxy where req.url is
    // http://localhost:3000
    return new NextResponse(null, { status: 303, headers: { Location: "/admin/update" } });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
