import { getI18n } from "@/i18n/server";
import { requireHost } from "@/lib/auth";
import PageHeader, { PageBody } from "@/components/PageHeader";
import { notFound } from "next/navigation";
import { getProperty } from "@/lib/store";
import PropertyForm from "../PropertyForm";

export const dynamic = "force-dynamic";

export default async function EditProperty({ params }: { params: Promise<{ id: string }> }) {
  const host = await requireHost();
  const { t } = await getI18n();
  const property = await getProperty((await params).id);
  if (!property || property.hostId !== host.id) notFound();
  return (
    <PageBody narrow>
      <PageHeader back={{ href: "/host/properties", label: t("nav.apartments") }} eyebrow={t("props.edit")} title={property.name} />
      <PropertyForm property={property} />
    </PageBody>
  );
}
