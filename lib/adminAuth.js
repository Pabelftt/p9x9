import crypto from "node:crypto";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import Admin from "@/models/Admin";

const SESSION_COOKIE = "adminAuth";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function signature(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function equalSignature(expected, actual) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function createAdminSession(adminId) {
  const secret = sessionSecret();
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set to at least 32 characters.");
  }

  const payload = Buffer.from(
    JSON.stringify({
      adminId: String(adminId),
      expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
    })
  ).toString("base64url");

  return {
    token: `${payload}.${signature(payload, secret)}`,
    maxAge: SESSION_TTL_SECONDS
  };
}

function readAdminSession(token) {
  const secret = sessionSecret();
  if (!secret || secret.length < 32 || typeof token !== "string") return null;

  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra !== undefined) return null;

  const expectedSignature = signature(payload, secret);
  if (!equalSignature(expectedSignature, providedSignature)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof session.adminId !== "string" ||
      !session.adminId ||
      !Number.isSafeInteger(session.expiresAt) ||
      session.expiresAt <= Date.now()
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function getAdmin() {
  const cookieStore = await cookies();
  const session = readAdminSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const envUsername = process.env.ADMIN_USERNAME?.trim();
  const envPassword = process.env.ADMIN_PASSWORD;

  if (session.adminId === "env-admin") {
    return envUsername && envPassword
      ? { _id: "env-admin", username: envUsername }
      : null;
  }

  try {
    await connectDB();
    return await Admin.findById(session.adminId).lean();
  } catch (error) {
    console.error("Unable to verify admin session:", error);
    return null;
  }
}
