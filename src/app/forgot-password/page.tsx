import AuthShell from "@/components/AuthShell";
import { getI18n } from "@/i18n/server";
import { site } from "@/lib/config";
import ForgotForm from "./ForgotForm";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t("forgot.title")} | ${site.name}`, robots: { index: false } };
}

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  const { t } = await getI18n();
  return (
    <AuthShell title={t("forgot.title")} subtitle={t("forgot.sub")}>
      <ForgotForm initialEmail={email.slice(0, 200)} supportEmail={site.supportEmail} />
    </AuthShell>
  );
}
