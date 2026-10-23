import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
  ".test",
  ".invalid",
  ".example"
];

function ipv4Number(address) {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  return parts.reduce((result, part) => ((result << 8) | part) >>> 0, 0);
}

function ipv4IsPublic(address) {
  const value = ipv4Number(address);
  if (value === null) return false;

  const blocked = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.88.99.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4]
  ];

  return !blocked.some(([network, prefix]) => {
    const networkValue = ipv4Number(network);
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    return (value & mask) === (networkValue & mask);
  });
}

function ipv6Number(address) {
  let value = address.toLowerCase().split("%")[0];

  if (value.includes(".")) {
    const separator = value.lastIndexOf(":");
    const ipv4 = ipv4Number(value.slice(separator + 1));
    if (ipv4 === null) return null;
    const high = ((ipv4 >>> 16) & 0xffff).toString(16);
    const low = (ipv4 & 0xffff).toString(16);
    value = `${value.slice(0, separator)}:${high}:${low}`;
  }

  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) {
    return null;
  }

  const groups = [
    ...left,
    ...Array(missing).fill("0"),
    ...right
  ];
  if (groups.length !== 8 || groups.some((group) => !/^[\da-f]{1,4}$/.test(group))) {
    return null;
  }

  return groups.reduce(
    (result, group) => (result << 16n) | BigInt(`0x${group}`),
    0n
  );
}

function prefixMatches(address, network, prefix) {
  const shift = BigInt(128 - prefix);
  return address >> shift === network >> shift;
}

function ipv6IsPublic(address) {
  const value = ipv6Number(address);
  if (value === null) return false;

  const mappedPrefix = BigInt("0xffff");
  if (value >> 32n === mappedPrefix) {
    const ipv4 = Number(value & 0xffffffffn);
    const dotted = [
      (ipv4 >>> 24) & 255,
      (ipv4 >>> 16) & 255,
      (ipv4 >>> 8) & 255,
      ipv4 & 255
    ].join(".");
    return ipv4IsPublic(dotted);
  }

  const globalUnicast = BigInt("0x20000000000000000000000000000000");
  const globalUnicastEnd = BigInt("0x40000000000000000000000000000000");
  const documentation = BigInt("0x20010db8000000000000000000000000");
  const sixToFour = BigInt("0x20020000000000000000000000000000");
  const teredo = BigInt("0x20010000000000000000000000000000");

  return (
    value >= globalUnicast &&
    value < globalUnicastEnd &&
    !prefixMatches(value, documentation, 32) &&
    !prefixMatches(value, sixToFour, 16) &&
    !prefixMatches(value, teredo, 32)
  );
}

function normalizedHostname(hostname) {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
}

export function isLikelyPrivateHost(hostname) {
  const normalized = normalizedHostname(hostname);
  if (!normalized) return true;

  if (net.isIP(normalized) === 4) return !ipv4IsPublic(normalized);
  if (net.isIP(normalized) === 6) return !ipv6IsPublic(normalized);

  return (
    normalized === "localhost" ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix)) ||
    !normalized.includes(".")
  );
}

function validTarget(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const target = new URL(value);
    if (
      !["http:", "https:"].includes(target.protocol) ||
      !target.hostname ||
      target.username ||
      target.password
    ) {
      return null;
    }
    return target;
  } catch {
    return null;
  }
}

export async function resolvePublicAddress(hostname, timeoutMs = 8000) {
  const host = normalizedHostname(hostname);
  if (isLikelyPrivateHost(host)) {
    throw new Error("Private or reserved host");
  }

  let addresses;
  if (net.isIP(host) !== 0) {
    addresses = [{ address: host, family: net.isIP(host) }];
  } else {
    let timer;
    try {
      addresses = await Promise.race([
        dns.lookup(host, { all: true, verbatim: true }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("DNS lookup timed out")), timeoutMs);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  if (!addresses.length || addresses.some(({ address }) => isLikelyPrivateHost(address))) {
    throw new Error("Host resolves to a private or reserved address");
  }
  return addresses[0];
}

function requestHead(target, address, timeoutMs, method = "HEAD") {
  return new Promise((resolve, reject) => {
    const client = target.protocol === "https:" ? https : http;
    const host = normalizedHostname(target.hostname);
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };

    const timer = setTimeout(() => {
      request.destroy(new Error("Request timed out"));
    }, timeoutMs);

    const request = client.request(
      {
        protocol: target.protocol,
        hostname: host,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method,
        headers: {
          "user-agent": "P9X9-Link-Check/1.0",
          accept: "*/*",
          ...(method === "GET" ? { range: "bytes=0-0" } : {})
        },
        lookup: (_lookupHost, _options, callback) =>
          callback(null, address.address, address.family),
        ...(target.protocol === "https:" && net.isIP(host) === 0
          ? { servername: host }
          : {})
      },
      (response) => {
        const result = {
          status: response.statusCode || 0,
          statusText: response.statusMessage || "",
          location: response.headers.location || null
        };
        response.destroy();
        finish(resolve, result);
      }
    );

    request.on("error", (error) => finish(reject, error));
    request.end();
  });
}

async function checkRedirectTarget(target, timeoutMs) {
  if (!target) return { allowed: false, destination: null };
  const parsed = validTarget(target);
  if (!parsed) return { allowed: false, destination: null };

  try {
    await resolvePublicAddress(parsed.hostname, timeoutMs);
    return {
      allowed: true,
      destination: `${parsed.origin}${parsed.pathname}`
    };
  } catch {
    return { allowed: false, destination: null };
  }
}

export async function checkUrlHealth(targetUrl, { timeoutMs = 8000 } = {}) {
  const target = validTarget(targetUrl);
  if (!target) {
    return {
      ok: false,
      status: 400,
      reason: "URL must be a valid HTTP or HTTPS address without credentials.",
      safe: false,
      statusCategory: "invalid"
    };
  }

  try {
    const address = await resolvePublicAddress(target.hostname, timeoutMs);
    let response = await requestHead(target, address, timeoutMs);

    if (response.status === 405 || response.status === 501) {
      response = await requestHead(target, address, timeoutMs, "GET");
    }

    if (response.status >= 300 && response.status < 400) {
      if (!response.location) {
        return {
          ok: false,
          status: response.status,
          reason: "The redirect has no valid destination and was not followed.",
          safe: false,
          statusCategory: "redirect"
        };
      }

      let redirectUrl = null;
      try {
        redirectUrl = new URL(response.location, target).toString();
      } catch {
        return {
          ok: false,
          status: response.status,
          reason: "The redirect destination is invalid and was not followed.",
          safe: false,
          statusCategory: "redirect"
        };
      }

      const redirect = await checkRedirectTarget(redirectUrl, timeoutMs);
      return {
        ok: false,
        status: response.status,
        reason: redirect.allowed
          ? "The URL redirects. The destination was checked for private addresses but was not followed."
          : "The redirect destination is private, reserved, or invalid and was blocked.",
        safe: redirect.allowed,
        redirectTo: redirect.destination,
        statusCategory: "redirect"
      };
    }

    if (response.status === 0) {
      return {
        ok: false,
        status: 0,
        reason: "The provider returned no HTTP status.",
        safe: true,
        statusCategory: "temporary"
      };
    }

    if (response.status === 403 || response.status === 429 || response.status >= 500) {
      return {
        ok: false,
        status: response.status,
        reason: "The provider denied or temporarily failed the check; link availability is unconfirmed.",
        safe: true,
        statusCategory: "temporary"
      };
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      reason:
        response.status === 404 || response.status === 410
          ? "The provider reports that this resource is unavailable."
          : undefined,
      safe: true,
      statusCategory:
        response.status >= 200 && response.status < 300 ? "healthy" : "failure"
    };
  } catch (error) {
    const reason =
      error?.message === "Private or reserved host" ||
      error?.message === "Host resolves to a private or reserved address"
        ? "Private, local, or reserved destinations are blocked."
        : error?.message === "DNS lookup timed out" ||
            error?.message === "Request timed out"
          ? "The URL check timed out."
          : "The provider could not be reached.";

    return {
      ok: false,
      status: 0,
      reason,
      safe: !reason.includes("Private"),
      statusCategory: reason.includes("Private") ? "blocked" : "temporary"
    };
  }
}
