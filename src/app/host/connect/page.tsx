import { redirect } from "next/navigation";

// Calendars are connected on the dashboard now (section #calendars); keep old links working.
export default async function Connect({ searchParams }: { searchParams: Promise<{ apt?: string; platform?: string }> }) {
  const { apt, platform } = await searchParams;
  const q = apt && platform ? `?${new URLSearchParams({ apt, platform })}` : "";
  redirect(`/host${q}#calendars`);
}
