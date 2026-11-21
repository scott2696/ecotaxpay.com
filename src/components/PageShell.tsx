import JsonLd from "./JsonLd";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

/** Layout for public content pages: homepage header, a hero band, content, homepage footer. */
export default function PageShell({ title, lead, schema, children }: { title: string; lead?: string; schema: object; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <JsonLd data={schema} />
      <SiteHeader />
      <section className="grain relative isolate overflow-hidden pb-14 pt-20 sm:pt-28">
        {/* A faint seam of light behind the title, echoing the homepage film */}
        <div className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(50%_70%_at_50%_0%,rgba(255,255,255,0.07),transparent_70%)]" aria-hidden />
        <div className="page-enter mx-auto max-w-3xl px-5 text-center">
          <h1 className="text-silver pb-1 text-[clamp(2.6rem,6vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.045em]">{title}</h1>
          {lead && <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--muted)]">{lead}</p>}
        </div>
        <div className="hairline mx-auto mt-14 max-w-3xl" />
      </section>
      <main className="page-enter mx-auto w-full max-w-3xl flex-1 px-5 pb-24 pt-4">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Long-form text styling for legal pages (no typography plugin needed). */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-[var(--ink)] [&_a]:text-[var(--accent)] [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:ms-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:text-[var(--ink)] [&_table]:w-full [&_table]:text-sm [&_td]:border-b [&_td]:border-[var(--line)] [&_td]:py-2 [&_td]:pe-3 [&_td]:align-top [&_th]:border-b [&_th]:border-[var(--line)] [&_th]:py-2 [&_th]:pe-3 [&_th]:text-start [&_ul]:list-disc [&_ul]:space-y-1">
      {children}
    </div>
  );
}
