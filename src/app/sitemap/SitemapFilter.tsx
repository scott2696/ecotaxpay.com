"use client";

/** "Filter URLs…" box: hides table rows that don't match. */
export default function SitemapFilter({ placeholder }: { placeholder: string }) {
  return (
    <input
      type="search"
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll<HTMLTableRowElement>("[data-sitemap] tbody tr").forEach((tr) => {
          tr.style.display = tr.textContent?.toLowerCase().includes(q) ? "" : "none";
        });
      }}
      className="w-[340px] max-w-full rounded-[10px] border border-[#e4e4e0] bg-white px-3.5 py-2.5 text-sm text-[#17181b] outline-none focus:border-transparent focus:outline-2 focus:outline-[#2f7d5b]"
    />
  );
}
