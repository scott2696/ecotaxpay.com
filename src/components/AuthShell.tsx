import { Mark } from "./SiteHeader";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import LanguagePicker from "@/components/LanguagePicker";
import { languageOptions } from "@/i18n/server";
import { site } from "@/lib/config";

export default async function AuthShell({ title, subtitle, schema, children }: { title: string; subtitle?: string; schema?: object; children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      {schema && <JsonLd data={schema} />}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-[var(--ink)]"><Mark /> {site.name}</Link>
        <LanguagePicker options={await languageOptions()} />
      </div>
      <div className="lit page-enter rounded-[28px] p-8 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
        <h1 className="text-silver text-3xl font-semibold tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
