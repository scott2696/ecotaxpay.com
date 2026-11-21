import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import AuthShell from "@/components/AuthShell";
import { getI18n } from "@/i18n/server";
import { currentHost } from "@/lib/auth";
import { site } from "@/lib/config";
import { graph, pageMeta, pageSchema, siteSchema } from "@/lib/seo";

export async function generateMetadata() {
  const { t } = await getI18n();
  return pageMeta("/login", `${t("auth.login")} | ${site.name}`, t("auth.loginSub"));
}

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentHost()) redirect(next?.startsWith("/host") ? next : "/host");
  const { t, locale } = await getI18n();
  const schema = graph(siteSchema(), pageSchema("WebPage", "/login", t("auth.login"), t("auth.loginSub"), locale));
  return (
    <AuthShell schema={schema} title={t("auth.login")} subtitle={t("auth.loginSub")}>
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
