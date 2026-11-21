import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import AuthShell from "@/components/AuthShell";
import { getI18n } from "@/i18n/server";
import { currentHost } from "@/lib/auth";
import { site } from "@/lib/config";
import { graph, pageMeta, pageSchema, siteSchema } from "@/lib/seo";

export async function generateMetadata() {
  const { t } = await getI18n();
  return pageMeta("/register", `${t("auth.registerTitle")} | ${site.name}`, t("auth.registerSub"));
}

export default async function Register() {
  if (await currentHost()) redirect("/host");
  const { t, locale } = await getI18n();
  const schema = graph(siteSchema(), pageSchema("WebPage", "/register", t("auth.registerTitle"), t("auth.registerSub"), locale));
  return (
    <AuthShell schema={schema} title={t("auth.registerTitle")} subtitle={t("auth.registerSub")}>
      <AuthForm mode="register" />
    </AuthShell>
  );
}
