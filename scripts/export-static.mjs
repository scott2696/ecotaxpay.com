// Builds the static public site for GitHub Pages (ecotaxpay.com) into docs/.
//   npm run export:static
// The app itself (login, dashboard, guest payment pages, APIs) runs on APP_URL.
// Pages: every public page in every language (English at /, others at /es/, /it/, …),
// plus sitemaps, robots.txt, 404, assets, CNAME and .nojekyll. GitHub Pages serves main:/docs.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE = "https://ecotaxpay.com";
const APP = "https://app.ecotaxpay.com";
const OUT = "docs";
const DIST = ".next-static";
const PORT = 3999;
const LANGS = ["en", "es", "it", "fr", "de", "mt"];
// Destination pages: one per built-in destination (slugs from src/lib/destinations.ts).
const DESTINATION_SLUGS = [...readFileSync("src/lib/destinations.ts", "utf8").matchAll(/"[a-z]{2}-[a-z-]+": "([a-z-]+)"/g)].map((m) => m[1]);
const PAGES = ["/", "/about", "/contact", "/terms", "/privacy", "/cookies", "/sitemap", "/destinations", ...DESTINATION_SLUGS.map((s) => `/destinations/${s}`)];
const XML = ["/sitemap.xml", "/page-sitemap.xml", "/destination-sitemap.xml", "/legal-sitemap.xml", "/robots.txt"];

const env = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_PUBLIC_STATIC_SITE: "1",
  NEXT_PUBLIC_APP_URL: APP,
  NEXT_PUBLIC_BASE_URL: SITE,
  NEXT_DIST_DIR: DIST,
  NEXT_TELEMETRY_DISABLED: "1",
};
delete env.NEXT_PUBLIC_MARKETING_URL;
// Server secrets are never needed to render public pages; keep them out of the build entirely.
for (const k of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "FTD_TRACKER_KEY", "GOOGLE_TRANSLATE_API_KEY", "WHATSAPP_TOKEN"]) env[k] = "";

const run = (cmd, args, opts = {}) =>
  new Promise((ok, fail) => {
    const p = spawn(cmd, args, { stdio: "inherit", env, ...opts });
    p.on("exit", (code) => (code === 0 ? ok() : fail(new Error(`${cmd} ${args.join(" ")} exited ${code}`))));
  });

const localized = (lang, p) => (lang === "en" ? p : `/${lang}${p === "/" ? "/" : p}`);
/** Page address as GitHub Pages serves it: /about/ (with the slash), so canonical/hreflang/sitemap never redirect. */
const pageAddress = (lang, p) => {
  const path = localized(lang, p);
  return `${SITE}${path.endsWith("/") ? path : `${path}/`}`;
};
const LOCAL = `http://localhost:${PORT}`;
const pagePattern = PAGES.filter((p) => p !== "/").map((p) => p.slice(1)).join("|");

/** Point links to public pages at this language's copy (in the HTML and in Next's page data). */
function localizeLinks(html, lang) {
  if (lang === "en") return html;
  // Link targets: "/", "/#pricing", "/about", "/terms#x" … (not /_next, /media, app URLs).
  const target = `/((?:${pagePattern})(?=[/"#?\\\\])|(?=[#"\\\\]))`;
  return html
    .replace(new RegExp(`(href=")${target}`, "g"), `$1/${lang}/$2`) // HTML attributes
    .replace(new RegExp(`(\\\\"href\\\\":\\\\")${target}`, "g"), `$1/${lang}/$2`); // Next's page data: \"href\":\"/about\"
}

/** Canonical + hreflang for one page. */
function headLinks(html, lang, p) {
  const canonical = pageAddress(lang, p);
  html = html.replace(/<link rel="canonical" href="[^"]*"\/?>/, `<link rel="canonical" href="${canonical}"/>`);
  html = html.replace(/<meta property="og:url" content="[^"]*"\/?>/, `<meta property="og:url" content="${canonical}"/>`);
  const alts = [...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${pageAddress(l, p)}"/>`), `<link rel="alternate" hreflang="x-default" href="${pageAddress("en", p)}"/>`].join("");
  html = html.replace("</head>", `${alts}</head>`);
  // Structured data: this language's page node points at this language's address.
  if (lang !== "en") {
    const en = pageAddress("en", p);
    html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (_, open, json, close) =>
      open + ["", "#webpage", "#breadcrumb"].reduce((j, s) => j.split(`"${en}${s}"`).join(`"${canonical}${s}"`), json) + close,
    );
  }
  return html;
}

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${LOCAL}/robots.txt`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("static server did not start");
}

async function main() {
  await rm(DIST, { recursive: true, force: true });
  console.log("› Building the public site…");
  await run("npx", ["next", "build"]);

  const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env, stdio: "ignore" });
  try {
    await waitForServer();
    await rm(OUT, { recursive: true, force: true });
    await mkdir(OUT, { recursive: true });

    for (const lang of LANGS)
      for (const p of PAGES) {
        const res = await fetch(`${LOCAL}${p === "/" ? "/" : `${p}/`}`, { headers: { cookie: `lang=${lang}; tz=Europe/Malta` }, redirect: "manual" });
        if (!res.ok) throw new Error(`${p} (${lang}) → ${res.status}`);
        let html = (await res.text()).replaceAll(LOCAL, SITE);
        html = headLinks(localizeLinks(html, lang), lang, p);
        const file = path.join(OUT, localized(lang, p), p === "/" ? "" : "", "index.html");
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, html);
        console.log(`  ✓ ${localized(lang, p)}`);
      }

    const notFound = await fetch(`${LOCAL}/this-page-does-not-exist`, { headers: { cookie: "lang=en" } });
    await writeFile(path.join(OUT, "404.html"), (await notFound.text()).replaceAll(LOCAL, SITE));

    for (const f of XML) {
      const text = (await (await fetch(`${LOCAL}${f}`)).text()).replaceAll(LOCAL, SITE);
      await writeFile(path.join(OUT, f.slice(1)), text);
      console.log(`  ✓ ${f}`);
    }
  } finally {
    server.kill();
  }

  // Assets: Next's static files, the public/ folder, and the icons defined in src/app.
  await cp(path.join(DIST, "static"), path.join(OUT, "_next", "static"), { recursive: true });
  await cp("public", OUT, { recursive: true });
  for (const f of await readdir("src/app")) if (/^(favicon\.ico|icon\d?\.png|apple-icon\.png)$/.test(f)) await cp(path.join("src/app", f), path.join(OUT, f));
  await writeFile(path.join(OUT, "CNAME"), "ecotaxpay.com\n");
  await writeFile(path.join(OUT, ".nojekyll"), ""); // serve _next/ as-is (Jekyll would skip it)
  await rm(DIST, { recursive: true, force: true });
  console.log(`\n✓ Static site ready in ${OUT}/ (${LANGS.length} languages × ${PAGES.length} pages).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
