"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { appHref, STATIC_SITE } from "@/lib/urls";

/**
 * Header buttons: "Log in / Sign up", or "Dashboard" when logged in. On the static public site the
 * server can't know, so it asks the app (same site, login cookie included) after the page loads.
 */
export default function AccountLinks({
  loggedIn: initial,
  labels,
  mobile = false,
}: {
  loggedIn: boolean;
  labels: { dashboard: string; login: string; signup: string };
  mobile?: boolean;
}) {
  const [loggedIn, setLoggedIn] = useState(initial);

  useEffect(() => {
    if (!STATIC_SITE) return;
    fetch(appHref("/api/auth/status"), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.loggedIn && setLoggedIn(true))
      .catch(() => {});
  }, []);

  if (loggedIn)
    return <Link href={appHref("/host")} className={mobile ? "btn-silver h-12 text-base" : "btn-silver h-10 px-5 text-sm"}>{labels.dashboard}</Link>;
  return mobile ? (
    <>
      <Link href={appHref("/register")} className="btn-silver h-12 text-base">{labels.signup}</Link>
      <Link href={appHref("/login")} className="btn-ghost h-12 text-base">{labels.login}</Link>
    </>
  ) : (
    <>
      <Link href={appHref("/login")} className="px-3 py-2 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--ink)]">{labels.login}</Link>
      <Link href={appHref("/register")} className="btn-silver h-10 px-5 text-sm">{labels.signup}</Link>
    </>
  );
}
