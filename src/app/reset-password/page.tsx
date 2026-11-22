import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { getI18n } from "@/i18n/server";
import { hostForReset } from "@/lib/auth";
import { site } from "@/lib/config";
import ResetForm from "./ResetForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t("reset.title")} | ${site.name}`, robots: { index: false } };
}

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const { t } = await getI18n();
  const host = await hostForReset(token);
  return (
    <AuthShell title={t("reset.title")} subtitle={host ? t("reset.sub", { email: host.email }) : undefined}>
      {host ? (
        <ResetForm token={token} />
      ) : (
        <div className="space-y-4">
          <p className="rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">{t("reset.invalid")}</p>
          <Link href="/forgot-password" className="btn btn-primary btn-lg flex w-full text-center">
            {t("forgot.send")}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
