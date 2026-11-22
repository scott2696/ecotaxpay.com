import { getI18n } from "@/i18n/server";
import { requireHost } from "@/lib/auth";
import Link from "next/link";
import { listProperties } from "@/lib/store";
import { PlatformIcon } from "../BrandIcons";
import ChooseFirst from "./ChooseFirst";
import ConnectForm from "./ConnectForm";

export const dynamic = "force-dynamic";

// ?apt=<id>&platform=<id>: open that apartment with that platform's link box ready (e.g. after adding an apartment).
export default async function Connect({ searchParams }: { searchParams: Promise<{ apt?: string; platform?: string }> }) {
  const sp = await searchParams;
  const host = await requireHost();
  const { t } = await getI18n();
  const apartments = (await listProperties(host.id)).map((p) => ({
    id: p.id,
    name: p.name,
    calendars: Object.fromEntries(Object.entries(p.calendars ?? {}).filter((e): e is [string, string] => !!e[1])),
  }));
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/host" className="text-sm text-[var(--muted)] underline">← {t("nav.dashboard")}</Link>
      <div className="mb-6 mt-4 flex items-center gap-3">
        <span className="flex items-center gap-1">
          {["airbnb", "booking", "vrbo", "misterbandb"].map((id) => <PlatformIcon key={id} id={id} size={26} />)}
        </span>
        <h1 className="text-2xl font-semibold">{t("upcoming.connect")}</h1>
      </div>
      <p className="mb-6 text-[var(--muted)]">
        {t("connect.intro")}
      </p>
      {apartments.length ? (
        <ConnectForm apartments={apartments} focus={sp.apt && sp.platform ? { apt: sp.apt, platform: sp.platform } : undefined} />
      ) : (
        <ChooseFirst />
      )}
    </main>
  );
}
