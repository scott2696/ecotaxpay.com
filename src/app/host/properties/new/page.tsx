import { getI18n } from "@/i18n/server";
import { requireHost } from "@/lib/auth";
import PageHeader, { PageBody } from "@/components/PageHeader";
import { getProperty } from "@/lib/store";
import PropertyForm from "../PropertyForm";
import { platformById } from "@/lib/platforms";

export const dynamic = "force-dynamic";

// ?from=<id> copies another apartment's location, ID setting and arrival guide.
// ?connect=<platform>: came from "Connect calendars": after saving, go straight back to connect that platform.
export default async function NewProperty({ searchParams }: { searchParams: Promise<{ from?: string; connect?: string; then?: string }> }) {
  const { from, connect, then } = await searchParams;
  const host = await requireHost();
  const { t } = await getI18n();
  const found = from ? await getProperty(from) : null;
  const source = found?.hostId === host.id ? found : null;
  return (
    <PageBody narrow>
      <PageHeader back={{ href: "/host/properties", label: t("nav.apartments") }} title={t("props.add")} description={t("props.intro")} />
      {source && (
        <p className="note note-info mb-6">
          {t("props.copiedFrom", { name: source.name })}
        </p>
      )}
      <PropertyForm template={source ?? undefined} connectAfter={connect && platformById(connect) ? connect : undefined} returnToCalendars={then === "calendars"} />
    </PageBody>
  );
}
