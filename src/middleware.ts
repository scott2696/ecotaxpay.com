import { NextResponse, type NextRequest } from "next/server";
import { renewedSession, SESSION_COOKIE } from "@/lib/sessionRefresh";

const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/;

// On the app domain (app.ecotaxpay.com), the public pages live on the public site.
const MARKETING_URL = (process.env.NEXT_PUBLIC_MARKETING_URL ?? "").replace(/\/$/, "");
const PUBLIC_PAGES = new Set(["/", "/about", "/contact", "/terms", "/privacy", "/cookies", "/sitemap", "/sitemap.xml", "/page-sitemap.xml", "/legal-sitemap.xml"]);

// The app's own address (app.ecotaxpay.com). Visits on the host's default address
// (e.g. ecotaxpay.onrender.com) are sent there, so that address never shows.
const APP_HOST = (() => {
  try {
    return process.env.NEXT_PUBLIC_BASE_URL ? new URL(process.env.NEXT_PUBLIC_BASE_URL).host : "";
  } catch {
    return "";
  }
})();

export async function middleware(req: NextRequest) {
  const res = await route(req);
  // Rolling login: renew the session (at most once a day) so active hosts never have to log in again.
  // Only on normal page loads: never during form posts (e.g. "Log out") or redirects.
  if (req.method === "GET" && !res.headers.get("location")) {
    const renewed = await renewedSession(req.cookies.get(SESSION_COOKIE)?.value);
    if (renewed)
      res.cookies.set(SESSION_COOKIE, renewed.value, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: renewed.expires,
      });
  }
  return res;
}

function route(req: NextRequest): NextResponse {
  const { pathname, searchParams } = req.nextUrl;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (APP_HOST && host && host !== APP_HOST && /\.onrender\.com$/i.test(host) && pathname !== "/api/health")
    return NextResponse.redirect(`https://${APP_HOST}${pathname}${req.nextUrl.search}`, 308);

  if (MARKETING_URL && (PUBLIC_PAGES.has(pathname) || pathname === "/destination-sitemap.xml" || pathname === "/destinations" || pathname.startsWith("/destinations/"))) return NextResponse.redirect(`${MARKETING_URL}${pathname}${req.nextUrl.search}`, 308);

  // ?lang=xx (e.g. in a link the host sends) → remember the language, then show the clean URL.
  const lang = searchParams.get("lang");
  if (lang !== null) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("lang");
    const res = NextResponse.redirect(url);
    if (LANG_RE.test(lang)) res.cookies.set("lang", lang, { path: "/", maxAge: 31536000, sameSite: "lax" });
    return res;
  }

  // ?country=XX previews the site as seen from that country (prices, sample tax). Display only.
  const preview = searchParams.get("country")?.toUpperCase();
  const forward = preview && /^[A-Z]{2}$/.test(preview) ? new Headers(req.headers) : null;
  forward?.set("x-preview-country", preview!);
  const next = () => {
    const res = forward ? NextResponse.next({ request: { headers: forward } }) : NextResponse.next();
    if (MARKETING_URL) res.headers.set("X-Robots-Tag", "noindex, nofollow"); // the app itself stays out of search results
    return res;
  };

  // Host area: no session cookie → log in. The cookie's signature and the host's ownership of
  // each record are verified on the server (lib/auth.ts) by every page and API.
  const hostArea = pathname.startsWith("/host") || pathname.startsWith("/api/host");
  if (!hostArea || req.cookies.has("etp_session")) return next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!_next/|favicon.ico|api/webhook|api/receipt).*)"] };
