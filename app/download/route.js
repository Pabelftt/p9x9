import http from "node:http";
import https from "node:https";
import net from "node:net";
import { rateLimit } from "@/lib/security";
import {
  createPinnedLookup,
  isLikelyPrivateHost,
  resolvePublicAddress
} from "@/lib/linkCheck";

export const dynamic = "force-dynamic";

const MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon"
]);

function requestImage(target, address, timeoutMs) {
  return new Promise((resolve, reject) => {
    const client = target.protocol === "https:" ? https : http;
    const hostname = target.hostname.replace(/^\[|\]$/g, "");
    let settled = false;
    let size = 0;
    const chunks = [];
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    const timer = setTimeout(
      () => request.destroy(new Error("Request timed out")),
      timeoutMs
    );

    const request = client.get(
      {
        protocol: target.protocol,
        hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        headers: {
          "user-agent": "P9X9-Image-Download/1.0",
          accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.5"
        },
        lookup: createPinnedLookup(address),
        ...(target.protocol === "https:" && net.isIP(hostname) === 0
          ? { servername: hostname }
          : {})
      },
      (response) => {
        const status = response.statusCode || 0;
        const location = response.headers.location || null;
        if ([301, 302, 303, 307, 308].includes(status)) {
          response.destroy();
          finish(resolve, { status, location });
          return;
        }

        const contentType = String(response.headers["content-type"] || "")
          .split(";")[0]
          .trim()
          .toLowerCase();
        const contentLength = Number(response.headers["content-length"]);
        if (status !== 200) {
          response.destroy();
          finish(resolve, { status });
          return;
        }
        if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
          response.destroy();
          finish(resolve, { error: "unsupported-type" });
          return;
        }
        if (Number.isFinite(contentLength) && contentLength > MAX_DOWNLOAD_BYTES) {
          response.destroy();
          finish(resolve, { error: "too-large" });
          return;
        }

        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > MAX_DOWNLOAD_BYTES) {
            response.destroy();
            finish(resolve, { error: "too-large" });
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          finish(resolve, {
            status,
            contentType,
            buffer: Buffer.concat(chunks, size)
          })
        );
        response.on("aborted", () =>
          finish(reject, new Error("Upstream image response was interrupted"))
        );
        response.on("error", (error) => finish(reject, error));
      }
    );

    request.on("error", (error) => finish(reject, error));
  });
}

export async function GET(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`image-download:${ip}`, 60_000, 30)) {
    return new Response("Too many download requests", { status: 429 });
  }

  const rawUrl = new URL(req.url).searchParams.get("url");
  if (!rawUrl || rawUrl.length > 2048) {
    return new Response("A valid image URL is required", { status: 400 });
  }

  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    return new Response("A valid image URL is required", { status: 400 });
  }

  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.username ||
    target.password
  ) {
    return new Response("Unsupported image URL", { status: 400 });
  }

  try {
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      if (isLikelyPrivateHost(target.hostname)) {
        return new Response("Private or local destinations are blocked", { status: 400 });
      }

      const address = await resolvePublicAddress(target.hostname, 8000);
      const result = await requestImage(target, address, 8000);

      if (result.error === "too-large") {
        return new Response("Image exceeds the 5 MB download limit", { status: 413 });
      }
      if (result.error === "unsupported-type") {
        return new Response("Only supported image files can be downloaded", { status: 415 });
      }
      if (result.location) {
        if (redirects === 3) {
          return new Response("Too many redirects", { status: 502 });
        }
        target = new URL(result.location, target);
        if (
          !["http:", "https:"].includes(target.protocol) ||
          target.username ||
          target.password
        ) {
          return new Response("Unsupported redirect destination", { status: 400 });
        }
        continue;
      }
      if (result.status !== 200 || !result.buffer) {
        return new Response("The image provider could not complete the download", { status: 502 });
      }

      const extensionByType = {
        "image/avif": "avif",
        "image/bmp": "bmp",
        "image/gif": "gif",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/x-icon": "ico",
        "image/vnd.microsoft.icon": "ico"
      };

      return new Response(new Uint8Array(result.buffer), {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="image.${extensionByType[result.contentType]}"`,
          "Content-Length": String(result.buffer.length),
          "Content-Type": result.contentType,
          "X-Content-Type-Options": "nosniff"
        }
      });
    }
  } catch (error) {
    if (error?.message === "Private or reserved host" ||
        error?.message === "Host resolves to a private or reserved address") {
      return new Response("Private or local destinations are blocked", { status: 400 });
    }
    console.error("Image download failed:", error?.message || "unknown error");
    return new Response("Download failed", { status: 502 });
  }

  return new Response("Download failed", { status: 502 });
}
