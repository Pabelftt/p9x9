import { NextResponse } from "next/server";
import { getCategories } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ categories: await getCategories() });
  } catch (error) {
    console.error("Failed to load video categories:", error);
    return NextResponse.json({ error: "Unable to load categories." }, { status: 500 });
  }
}
