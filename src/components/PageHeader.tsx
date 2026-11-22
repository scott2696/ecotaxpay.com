import Link from "next/link";
import Icon from "./Icon";

/** Top of every host page: optional back link, eyebrow, title, description and actions. */
export default function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="rise mb-6 sm:mb-8">
      {back && (
        <Link href={back.href} className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)]">
          <Icon name="arrowLeft" size={15} /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[1.75rem]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Page width and padding for the host area. */
export function PageBody({ children, narrow = false, className = "" }: { children: React.ReactNode; narrow?: boolean; className?: string }) {
  return <main className={`mx-auto w-full ${narrow ? "max-w-3xl" : "max-w-6xl"} px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 ${className}`}>{children}</main>;
}
