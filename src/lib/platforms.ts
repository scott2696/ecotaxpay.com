// Booking platforms and tools whose calendars can be synced by iCal (.ics) link.
// Shared by the server (validation, sync) and the browser (connect page, badges).
// To add one: append it here (id must stay stable: saved links are stored under it).

export type Platform = {
  id: string;
  name: string;
  /** Brand colour for its badge. */
  color: string;
  /** Short text for the badge when there is no logo. */
  mark: string;
  /** Logo in /public/platforms (see the README there). `ratio` = width / height for wordmarks. */
  logo?: string;
  ratio?: number;
  group: "ota" | "manager" | "other";
  /** Only links on these hosts are accepted (for the two platforms we know exactly). */
  hosts?: RegExp;
  /** Where to find the link, in the platform's own (English) menu names. */
  where?: string;
  placeholder?: string;
  /** Feed entries that are the host's own blocks, not bookings. */
  blocked?: RegExp;
};

export const PLATFORMS: Platform[] = [
  // Booking sites
  {
    id: "airbnb", name: "Airbnb", color: "#FF5A5F", mark: "A", group: "ota", hosts: /(^|\.)airbnb\.[a-z.]+$/i,
    where: "Calendar → choose the listing → Availability → Connect calendars → Connect another website → copy the link ending in .ics",
    placeholder: "https://www.airbnb.com/calendar/ical/…ics?s=…", blocked: /not available|blocked/i,
  },
  {
    id: "booking", name: "Booking.com", color: "#003580", mark: "B.", group: "ota", hosts: /(^|\.)booking\.com$/i,
    where: "Extranet → Rates & Availability → Sync calendars → Add calendar connection → copy the export link",
    placeholder: "https://admin.booking.com/hotel/hoteladmin/ical.html?t=…",
  },
  { id: "vrbo", name: "Vrbo / Abritel / FeWo-direkt", color: "#245ABC", mark: "V", logo: "/platforms/vrbo.svg", ratio: 3.1, group: "ota", where: "Calendar → Import/Export → Export calendar → copy the link", blocked: /^blocked$/i },
  { id: "misterbandb", name: "Misterb&b", color: "#2D2D86", mark: "M", logo: "/platforms/misterbandb.svg", ratio: 3.4, group: "ota" },
  { id: "agoda", name: "Agoda Homes", color: "#5542F6", mark: "Ag", logo: "/platforms/agoda.svg", ratio: 1.9, group: "ota" },
  { id: "expedia", name: "Expedia", color: "#1F2B6C", mark: "E", logo: "/platforms/expedia.svg", group: "ota" },
  { id: "holidu", name: "Holidu", color: "#00809D", mark: "H", logo: "/platforms/holidu.svg", ratio: 3.2, group: "ota" },
  { id: "hometogo", name: "HomeToGo", color: "#F55A1E", mark: "Hg", logo: "/platforms/hometogo.svg", ratio: 1.8, group: "ota" },
  { id: "tripadvisor", name: "Tripadvisor", color: "#34E0A1", mark: "T", logo: "/platforms/tripadvisor.svg", group: "ota" },
  { id: "plumguide", name: "Plum Guide", color: "#3E2A4F", mark: "P", logo: "/platforms/plumguide.png", group: "ota" },
  { id: "houfy", name: "Houfy", color: "#1C9AD6", mark: "Hf", logo: "/platforms/houfy.png", group: "ota" },
  { id: "casevacanza", name: "CaseVacanza.it", color: "#E30613", mark: "CV", logo: "/platforms/casevacanza.png", group: "ota" },
  { id: "hipcamp", name: "Hipcamp", color: "#FF6B3D", mark: "Hc", logo: "/platforms/hipcamp.png", ratio: 3.4, group: "ota" },
  { id: "glampinghub", name: "Glamping Hub", color: "#4C8C2B", mark: "G", logo: "/platforms/glampinghub.png", group: "ota" },
  // Channel managers / PMS (they export one calendar per listing)
  { id: "smoobu", name: "Smoobu", color: "#1BB0CE", mark: "S", logo: "/platforms/smoobu.svg", group: "manager" },
  { id: "lodgify", name: "Lodgify", color: "#2D5BFF", mark: "L", logo: "/platforms/lodgify.png", group: "manager" },
  { id: "beds24", name: "Beds24", color: "#2A6EBB", mark: "24", logo: "/platforms/beds24.png", ratio: 1.45, group: "manager" },
  { id: "hostaway", name: "Hostaway", color: "#FF6338", mark: "Ha", logo: "/platforms/hostaway.png", group: "manager" },
  { id: "guesty", name: "Guesty", color: "#1A2B49", mark: "Gy", logo: "/platforms/guesty.png", group: "manager" },
  { id: "hospitable", name: "Hospitable", color: "#E4405F", mark: "Hs", logo: "/platforms/hospitable.png", group: "manager" },
  { id: "ownerrez", name: "OwnerRez", color: "#2F6EA5", mark: "OR", logo: "/platforms/ownerrez.png", group: "manager" },
  // Direct bookings and anything else with an iCal link
  {
    id: "google", name: "Google Calendar", color: "#4285F4", mark: "G", logo: "/platforms/google.svg", group: "other",
    where: "Settings → your calendar → Integrate calendar → Secret address in iCal format",
    placeholder: "https://calendar.google.com/calendar/ical/…/basic.ics",
  },
  { id: "other", name: "Other (iCal link)", color: "#6B7280", mark: "iCal", group: "other" },
];

export const platformById = (id: string): Platform | undefined => PLATFORMS.find((p) => p.id === id);
export const platformName = (id: string) => platformById(id)?.name ?? id;

/**
 * When calendars are synced with each other, one stay shows up in several feeds. Keep the one from
 * the platform whose feed holds only real bookings (Booking.com marks every busy date "CLOSED").
 */
export function platformPriority(id: string): number {
  if (id === "booking") return 900;
  if (id === "google" || id === "other") return 950;
  const i = PLATFORMS.findIndex((p) => p.id === id);
  return i < 0 ? 999 : i;
}
