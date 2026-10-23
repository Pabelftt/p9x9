// /api/admin/login - same as old adminController.adminLoginPost
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Admin from "@/models/Admin";
import { createAdminSession } from "@/lib/adminAuth";
import {
  hashPassword,
  isScryptPasswordHash,
  rateLimit,
  timingSafeEqual,
  verifyPassword
} from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!rateLimit(`admin-login:${ip}`, 60_000, 10)) {
    return NextResponse.json({ success: false, error: "Too many login attempts. Please wait a minute." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (
    !username ||
    !password ||
    username.length < 3 ||
    username.length > 200 ||
    password.length < 4 ||
    password.length > 200
  ) {
    return NextResponse.json({ success: false, error: "Username or password is invalid." }, { status: 400 });
  }

  try {
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;
    if (!sessionSecret || sessionSecret.length < 32) {
      return NextResponse.json(
        { success: false, error: "Admin sessions are not configured. Set ADMIN_SESSION_SECRET to at least 32 characters." },
        { status: 503 }
      );
    }

    const envUsername = process.env.ADMIN_USERNAME?.trim();
    const envPassword = process.env.ADMIN_PASSWORD;

    if (envUsername && envPassword) {
      const validCredentials =
        timingSafeEqual(username, envUsername) &&
        timingSafeEqual(password, envPassword);
      if (!validCredentials) {
        return NextResponse.json({ success: false, error: "Username or Password is incorrect." }, { status: 401 });
      }

      const res = NextResponse.json({ success: true, redirect: "/admin/dashboard" });
      const session = createAdminSession("env-admin");
      res.cookies.set("adminAuth", session.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: session.maxAge,
        path: "/"
      });
      return res;
    }

    await connectDB();
    const admin = await Admin.findOne({ username }).lean();

    const storedPassword = String(admin?.password || "");
    const validCredentials =
      Boolean(admin?.password) && (await verifyPassword(password, storedPassword));
    if (!validCredentials) {
      return NextResponse.json(
        { success: false, error: "Username or Password is incorrect." },
        { status: 401 }
      );
    }

    if (!isScryptPasswordHash(storedPassword)) {
      const upgradedPassword = await hashPassword(password);
      await Admin.updateOne(
        { _id: admin._id, password: storedPassword },
        { $set: { password: upgradedPassword } }
      );
    }

    const res = NextResponse.json({
      success: true,
      redirect: "/admin/dashboard"
    });

    const session = createAdminSession(admin._id.toString());
    res.cookies.set("adminAuth", session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: session.maxAge,
      path: "/"
    });

    return res;
  } catch (err) {
    console.error("Admin login failed:", err);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
