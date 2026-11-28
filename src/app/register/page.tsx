import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import AuthShell from "@/components/AuthShell";
import { getI18n } from "@/i18n/server";
import { currentHost } from "@/lib/auth";
import { site } from "@/lib/config";
import { isPlanId, visitorPlans } from "@/lib/pricing";
import { graph, pageMeta, pageSchema, siteSchema } from "@/lib/seo";

export async function generateMetadata() {
  const { t } = await getI18n();
  return pageMeta("/register", `${t("auth.registerTitle")} | ${site.name}`, t("auth.registerSub"));
}

export default async function Register({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  // Already logged in (e.g. clicked a plan on the pricing page): go to Account with that plan
  // selected, ready to subscribe, instead of a sign-up form they don't need.
  if (await currentHost()) redirect(`/host/account${isPlanId(plan) ? `?plan=${plan}` : ""}#subscribe`);
  const { t, locale } = await getI18n();
  const plans = (await visitorPlans(locale)).map(({ id, months, label, perMonthLabel, savePct }) => ({ id, months, label, perMonthLabel, savePct }));
  const schema = graph(siteSchema(), pageSchema("WebPage", "/register", t("auth.registerTitle"), t("auth.registerSub"), locale));
  return (
    <AuthShell schema={schema} title={t("auth.registerTitle")} subtitle={t("auth.registerSub")}>
      <AuthForm mode="register" plans={plans} initialPlan={plan} />
    </AuthShell>
  );
}
