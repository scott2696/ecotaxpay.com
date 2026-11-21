import { getI18n } from "@/i18n/server";
import { requireHost } from "@/lib/auth";
import Link from "next/link";
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
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/host/properties" className="text-sm text-[var(--muted)] underline">← {t("nav.apartments")}</Link>
      <h1 className="mb-6 mt-3 text-2xl font-semibold">{property.name}</h1>
      <PropertyForm property={property} />
    </main>
  );
}
