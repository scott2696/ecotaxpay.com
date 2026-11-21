"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Tells the server the device's time zone, so prices and sample stays match where the visitor is
 * when the hosting edge doesn't say. Refreshes once, on the first visit, if the zone was unknown.
 */
export default function TimeZoneCookie() {
  const router = useRouter();
  useEffect(() => {
    let tz = "";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    } catch {}
    if (!tz) return;
    const value = encodeURIComponent(tz);
    const current = document.cookie.match(/(?:^|; )tz=([^;]*)/)?.[1];
    if (current === value) return;
    document.cookie = `tz=${value}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
