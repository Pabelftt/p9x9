import http from "node:http";
import https from "node:https";
import net from "node:net";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  createPinnedLookup,
  isLikelyPrivateHost,
  resolvePublicAddress
} from "@/lib/linkCheck";
import Post from "@/models/Post";

export const dynamic = "force-dynamic";

function isAllowedVideoUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      url.hostname &&
      !url.username &&
      !url.password &&
      !isLikelyPrivateHost(url.hostname)
      ? url
      : null;
  } catch {
    return null;
  }
}

function getVideoRequestHeaders(request) {
  const headers = {
    "accept-encoding": "identity",
    "user-agent": request.headers.get("user-agent") || "P9X9-Media/1.0"
  };
  for (const name of ["range", "if-range", "if-none-match", "if-modified-since"]) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

function getHeader(response, name) {
  const value = response.headers[name.toLowerCase()];
  return Array.isArray(value) ? value.join(", ") : value || null;
}

function requestVideoSource(target, address, headers, signal) {
  return new Promise((resolve, reject) => {
    const client = target.protocol === "https:" ? https : http;
    const hostname = target.hostname.replace(/^\[|\]$/g, "");
    let upstreamResponse = null;
    let settled = false;
    const cleanup = () => {
      clearTimeout(headerTimer);
      signal.removeEventListener("abort", onAbort);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const onAbort = () => {
      request.destroy(new Error("Client request aborted"));
      upstreamResponse?.destroy();
    };
    const headerTimer = setTimeout(
      () => request.destroy(new Error("Upstream request timed out")),
      10_000
    );
    const request = client.request(
      {
        protocol: target.protocol,
        hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method: "GET",
        headers,
        lookup: createPinnedLookup(address),
        ...(target.protocol === "https:" && net.isIP(hostname) === 0
          ? { servername: hostname }
          : {})
      },
      (response) => {
        upstreamResponse = response;
        clearTimeout(headerTimer);
        request.setTimeout(30_000, () =>
          request.destroy(new Error("Upstream media stream timed out"))
        );
        response.once("close", () => signal.removeEventListener("abort", onAbort));
        settled = true;
        resolve(response);
      }
    );

    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    request.on("error", (error) => finish(reject, error));
    request.end();
  });
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
      const address = await resolvePublicAddress(sourceUrl.hostname, 8000);
      upstream = await requestVideoSource(
        sourceUrl,
        address,
        upstreamHeaders,
        request.signal
      );

      if (![301, 302, 303, 307, 308].includes(upstream.statusCode)) break;
      const location = getHeader(upstream, "location");
      upstream.destroy();
      if (!location || redirects === 5) {
        return new Response("Video source redirect failed", {
          status: 502,
          headers: { "Cache-Control": "no-store" }
        });
      }

      try {
        sourceUrl = isAllowedVideoUrl(new URL(location, sourceUrl).toString());
      } catch {
        sourceUrl = null;
      }
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
      const value = getHeader(upstream, name);
      if (value) responseHeaders.set(name, value);
    }

    const upstreamCacheControl = getHeader(upstream, "cache-control") || "";
    const upstreamVariesByStar = getHeader(upstream, "vary")
      ?.split(",")
      .some((value) => value.trim() === "*");
    const isPublicMediaResponse =
      [200, 206, 304].includes(upstream.statusCode) &&
      !/\b(private|no-store|no-cache)\b/i.test(upstreamCacheControl) &&
      !upstream.headers["set-cookie"] &&
      !upstreamVariesByStar;

    responseHeaders.set(
      "Cache-Control",
      isPublicMediaResponse
        ? "public, max-age=600"
        : /\b(private|no-store|no-cache)\b/i.test(upstreamCacheControl)
          ? upstreamCacheControl
          : "no-store"
    );

    return new Response(
      [204, 205, 304].includes(upstream.statusCode)
        ? null
        : Readable.toWeb(upstream),
      {
        status: upstream.statusCode,
        headers: responseHeaders
      }
    );
  } catch (error) {
    if (request.signal.aborted) throw error;
    console.error("Video media proxy failed:", error?.message || "unknown error");
    return NextResponse.json(
      { error: "Unable to load video" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
