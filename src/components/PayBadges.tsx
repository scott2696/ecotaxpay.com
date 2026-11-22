/**
 * Small payment-brand badges (Visa, Mastercard, …) shown wherever a payment option is offered.
 * Simple inline SVG / text marks: no external images, render the same on server and client.
 */
export type CardBrand = "visa" | "mastercard" | "amex" | "maestro" | "applepay" | "googlepay";
export const CARD_BRANDS: CardBrand[] = ["visa", "mastercard", "amex", "maestro", "applepay", "googlepay"];
export const BRAND_NAMES: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  maestro: "Maestro",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
};

// White tile, like the acceptance marks on a shop door. Logos live in /public/brands (see README there).
const tile = "inline-flex h-6 w-[40px] items-center justify-center overflow-hidden rounded-[5px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]";

/* eslint-disable @next/next/no-img-element -- tiny static SVGs, no optimisation needed */
function Badge({ brand }: { brand: CardBrand }) {
  if (brand === "googlepay")
    return (
      <span className={`${tile} gap-[3px] text-[10.5px] font-semibold text-[#3c4043]`}>
        <svg width="11" height="11" viewBox="0 0 48 48" aria-hidden>
          <path fill="#4285f4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8a10 10 0 0 1-4.4 6.6v5.5h7.1c4.2-3.9 6.6-9.6 6.6-16.1z" />
          <path fill="#34a853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.7A22 22 0 0 0 24 46z" />
          <path fill="#fbbc05" d="M11.7 28.2a13.2 13.2 0 0 1 0-8.4v-5.7H4.4a22 22 0 0 0 0 19.8z" />
          <path fill="#ea4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3A21.9 21.9 0 0 0 4.4 14.1l7.3 5.7c1.7-5.2 6.6-9.1 12.3-9.1z" />
        </svg>
        Pay
      </span>
    );
  // Amex's logo is a blue square with the words across the middle: use a version cropped to the words.
  if (brand === "amex")
    return (
      <span className="inline-flex h-6 w-[40px] overflow-hidden rounded-[5px] bg-[#016fd0]">
        {/* amex-badge.svg: the official logo cropped to the words, with a blue margin, at the tile's 5:3 shape */}
        <img src="/brands/amex-badge.svg" alt="" className="h-full w-full" />
      </span>
    );
  return (
    <span className={tile}>
      <img src={`/brands/${brand}.svg`} alt="" className={`h-full w-full object-contain ${brand === "visa" ? "px-1.5" : "p-[3px]"}`} />
    </span>
  );
}

/** Logos for payment apps (Revolut, PayPal, Bizum, …); other methods get a simple icon. */
const APP_LOGOS: Record<string, { file: string; wide?: boolean }> = {
  revolut: { file: "revolut" }, paypal: { file: "paypal" }, wise: { file: "wise" },
  bizum: { file: "bizum", wide: true }, mbway: { file: "mbway", wide: true }, satispay: { file: "satispay", wide: true },
  twint: { file: "twint", wide: true }, wero: { file: "wero", wide: true },
};
const GLYPHS: Record<string, string> = { bank: "🏦", card: "💳", cardOnArrival: "💳", link: "🔗", cash: "💶" };

export function MethodLogo({ id }: { id: string }) {
  const logo = APP_LOGOS[id];
  if (!logo) return <span className="inline-flex h-7 w-7 items-center justify-center text-lg" aria-hidden>{GLYPHS[id] ?? "•"}</span>;
  return (
    <span className={`inline-flex h-7 shrink-0 items-center justify-center rounded-md bg-white px-1.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] ${logo.wide ? "w-[64px]" : "w-7"}`}>
      <img src={`/brands/${logo.file}.svg`} alt="" className="h-[70%] w-full object-contain" />
    </span>
  );
}
/* eslint-enable @next/next/no-img-element */

/** A row of brand badges. `label` is read by screen readers instead of the pictures. */
export default function PayBadges({ brands = CARD_BRANDS, className = "" }: { brands?: CardBrand[]; className?: string }) {
  if (!brands.length) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`} role="img" aria-label={brands.map((b) => BRAND_NAMES[b]).join(", ")}>
      {brands.map((b) => (
        <Badge key={b} brand={b} />
      ))}
    </span>
  );
}
