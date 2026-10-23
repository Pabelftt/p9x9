import { NextResponse } from "next/server";
import {
  VIDEO_RETURN_COOKIE,
  getSafeVideoReturnPath,
  getVideoRedirectUrl
} from "@/lib/videoContinue";
import { getAdSettings } from "@/lib/adSettings";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body.routeName !== "string") {
    return NextResponse.json({ error: "Invalid video route" }, { status: 400 });
  }

  const returnPath = getSafeVideoReturnPath(`/videos/${body.routeName}`);
  if (!returnPath) {
    return NextResponse.json({ error: "Invalid video route" }, { status: 400 });
  }

  const createdAt = Date.now();
  const returnExpiresAt = createdAt + 300_000;
  const adSettings = await getAdSettings();
  const response = NextResponse.json({
    redirectAvailable: adSettings.videoRedirect && Boolean(getVideoRedirectUrl()),
    returnExpiresAt
  });
  response.cookies.set(
    VIDEO_RETURN_COOKIE,
    `${returnPath}|${createdAt}`,
    {
      httpOnly: true,
      maxAge: 300,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  );
  return response;
}

export async function GET(request) {
  const returnPath = getSafeVideoReturnPath(
    request.nextUrl.searchParams.get("returnPath")
  );
  if (!returnPath) {
    return NextResponse.json({ error: "Invalid return path" }, { status: 400 });
  }

  const adSettings = await getAdSettings();
  const destination = adSettings.videoRedirect ? getVideoRedirectUrl() : null;
  return NextResponse.redirect(
    new URL(destination || returnPath, request.url),
    303
  );
}
