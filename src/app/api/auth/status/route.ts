import { NextResponse } from "next/server";
import { currentHost } from "@/lib/auth";

// "Am I logged in?" for the static public site (ecotaxpay.com), so its header can show "Dashboard"
// instead of "Log in / Sign up". ecotaxpay.com and app.ecotaxpay.com are the same site, so the
// (SameSite=Lax) login cookie is sent with this credentialed request. Answers yes/no only.
const ORIGIN = (process.env.NEXT_PUBLIC_MARKETING_URL ?? "").replace(/\/$/, "");

export const dynamic = "force-dynamic";

export async function GET() {
  const host = await currentHost();
  const res = NextResponse.json({ loggedIn: !!host });
  res.headers.set("Cache-Control", "no-store");
  if (ORIGIN) {
    res.headers.set("Access-Control-Allow-Origin", ORIGIN);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Vary", "Origin");
  }
  return res;
}
