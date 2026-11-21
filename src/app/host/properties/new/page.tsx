import { getI18n } from "@/i18n/server";
import { requireHost } from "@/lib/auth";
import Link from "next/link";
import { getProperty } from "@/lib/store";
import PropertyForm from "../PropertyForm";

export const dynamic = "force-dynamic";

// ?from=<id> copies another apartment's location, ID setting and arrival guide.
export default async function NewProperty({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const host = await requireHost();
  const { t } = await getI18n();
  const found = from ? await getProperty(from) : null;
  const source = found?.hostId === host.id ? found : null;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/host/properties" className="text-sm text-[var(--muted)] underline">← {t("nav.apartments")}</Link>
      <h1 className="mb-2 mt-3 text-2xl font-semibold">{t("props.add")}</h1>
      {source && (
        <p className="mb-6 rounded-lg bg-[var(--soft)] p-3 text-sm">
          {t("props.copiedFrom", { name: source.name })}
        </p>
      )}
      <PropertyForm template={source ?? undefined} />
    </main>
  );
}
