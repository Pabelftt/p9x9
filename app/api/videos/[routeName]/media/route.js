import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";

export const dynamic = "force-dynamic";

function isPrivateIpv4(hostname) {
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => value < 0 || value > 255)) {
    return true;
  }

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateIpv6(hostname) {
  const address = hostname.toLowerCase();
  return (
    address === "::" ||
    address === "::1" ||
    address.startsWith("fc") ||
    address.startsWith("fd") ||
    /^fe[89ab]/.test(address) ||
    address.startsWith("::ffff:")
  );
}

function isAllowedVideoUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const ipVersion = isIP(hostname);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password &&
      hostname !== "localhost" &&
      !hostname.endsWith(".localhost") &&
      !hostname.endsWith(".local") &&
      !hostname.endsWith(".internal") &&
      !hostname.endsWith(".test") &&
      !(ipVersion === 4 && isPrivateIpv4(hostname)) &&
      !(ipVersion === 6 && isPrivateIpv6(hostname))
    )
      ? url
      : null;
  } catch {
    return null;
  }
}

function getVideoRequestHeaders(request) {
  const headers = new Headers();
  headers.set("accept-encoding", "identity");
  for (const name of ["range", "if-range", "if-none-match", "if-modified-since"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

export async function GET(request, { params }) {
  try {
    const { routeName } = await params;
    await connectDB();
    const video = await Post.findOne({ routeName: routeName.toLowerCase() })
      .select("videoLink")
      .lean();

    if (!video) {
      return new Response("Video not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" }
      });
    }

    let sourceUrl = isAllowedVideoUrl(video.videoLink);
    if (!sourceUrl) {
      console.error("Rejected unsupported video source URL", { routeName });
      return new Response("Unsupported video source", {
        status: 502,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const upstreamHeaders = getVideoRequestHeaders(request);
    let upstream;
    for (let redirects = 0; redirects <= 5; redirects += 1) {
      upstream = await fetch(sourceUrl, {
        method: "GET",
        headers: upstreamHeaders,
        cache: "no-store",
        redirect: "manual",
        signal: request.signal
      });

      if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
      const location = upstream.headers.get("location");
      if (!location || redirects === 5) {
        return new Response("Video source redirect failed", {
          status: 502,
          headers: { "Cache-Control": "no-store" }
        });
      }

      sourceUrl = isAllowedVideoUrl(new URL(location, sourceUrl).toString());
      if (!sourceUrl) {
        return new Response("Unsupported video source redirect", {
          status: 502,
          headers: { "Cache-Control": "no-store" }
        });
      }
    }

    const responseHeaders = new Headers();
    for (const name of [
      "accept-ranges",
      "content-length",
      "content-range",
      "content-type",
      "etag",
      "last-modified"
    ]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    const upstreamCacheControl = upstream.headers.get("cache-control") || "";
    const upstreamVariesByStar = upstream.headers
      .get("vary")
      ?.split(",")
      .some((value) => value.trim() === "*");
    const isPublicMediaResponse =
      (upstream.status === 200 ||
        upstream.status === 206 ||
        upstream.status === 304) &&
      !/\b(private|no-store|no-cache)\b/i.test(upstreamCacheControl) &&
      !upstream.headers.has("set-cookie") &&
      !upstreamVariesByStar;

    responseHeaders.set(
      "Cache-Control",
      isPublicMediaResponse
        ? "public, max-age=600"
        : /\b(private|no-store|no-cache)\b/i.test(upstreamCacheControl)
          ? upstreamCacheControl
          : "no-store"
    );

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });
  } catch (error) {
    if (request.signal.aborted) throw error;
    console.error("Video media proxy failed:", error);
    return NextResponse.json(
      { error: "Unable to load video" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
