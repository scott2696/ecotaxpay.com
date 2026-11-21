import { NextResponse, type NextRequest } from "next/server";

const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/;

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

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
  const next = () => (forward ? NextResponse.next({ request: { headers: forward } }) : NextResponse.next());

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
