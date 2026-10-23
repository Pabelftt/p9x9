import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isValidPublicKey(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return false;

  try {
    const key = Buffer.from(value, "base64url");
    return key.length === 65 && key[0] === 4;
  } catch {
    return false;
  }
}

export async function GET() {
  const configuredKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  const publicKey = isValidPublicKey(configuredKey) ? configuredKey : null;

  return NextResponse.json(
    { publicKey },
    { headers: { "Cache-Control": "no-store" } }
  );
}
