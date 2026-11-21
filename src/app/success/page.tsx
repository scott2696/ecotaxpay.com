import { redirect } from "next/navigation";
import { confirmStripeSession } from "@/lib/payments";

// Stripe returns here; confirm the payment with Stripe, then show the guest their page
// (receipt + arrival guide) at the same personal link.
export default async function Success({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { id, session_id } = await searchParams;
  if (session_id) await confirmStripeSession(session_id).catch((e) => console.error(e));
  redirect(id ? `/p/${encodeURIComponent(id)}` : "/");
}
