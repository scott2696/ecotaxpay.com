<?xml version="1.0" encoding="UTF-8"?>
<!--
  Styles /sitemap.xml and the sub-sitemaps for people opening them in a browser.
  Search engines read the XML itself and ignore this file.
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  exclude-result-prefixes="s">
  <xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>

  <xsl:template match="/">
    <xsl:variable name="isIndex" select="count(s:sitemapindex) &gt; 0"/>
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title>XML Sitemap · Eco Tax Pay</title>
        <link rel="icon" href="/favicon.ico"/>
        <style>
          :root { --bg:#f4f4f2; --ink:#17181b; --muted:#6b6e75; --line:#e4e4e0; --head:#0b0c0e; --accent:#2f7d5b; --silver:#c9ccd2; }
          * { box-sizing: border-box; }
          body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif; }
          header { background:linear-gradient(180deg,#111215,#050506); color:#fff; padding:28px 0 26px; border-bottom:3px solid var(--silver); }
          .wrap { max-width:1040px; margin:0 auto; padding:0 24px; }
          .brand { display:flex; align-items:center; gap:12px; font-size:22px; font-weight:600; letter-spacing:-0.02em; color:#fff; text-decoration:none; }
          .brand img { width:36px; height:36px; }
          h1 { margin:22px 0 6px; font-size:26px; letter-spacing:-0.02em; }
          header p { margin:0; max-width:560px; color:#c7c9ce; font-size:14px; }
          header a { color:#fff; text-decoration:underline; text-decoration-style:dotted; text-underline-offset:3px; }
          .bar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; margin:30px 0 16px; }
          .bar p { margin:0; color:var(--muted); }
          .bar strong { color:var(--ink); }
          input { width:340px; max-width:100%; padding:10px 14px; border:1px solid var(--line); border-radius:10px; background:#fff; font:inherit; font-size:14px; }
          input:focus { outline:2px solid var(--accent); outline-offset:-1px; border-color:transparent; }
          table { width:100%; border-collapse:separate; border-spacing:0; background:#fff; border:1px solid var(--line); border-radius:14px; overflow:hidden; }
          th { background:var(--head); color:#fff; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; text-align:left; padding:14px 18px; }
          th.r, td.r { text-align:right; white-space:nowrap; }
          td { padding:12px 18px; border-top:1px solid var(--line); }
          tr:nth-child(even) td { background:#fafaf8; }
          td a { color:var(--accent); text-decoration:none; word-break:break-all; }
          td a:hover { text-decoration:underline; }
          td.muted { color:var(--muted); }
          footer { margin:18px 0 48px; color:var(--muted); font-size:12px; }
          footer a { color:var(--muted); }
          @media (max-width:640px) { .hide-sm { display:none; } td, th { padding:11px 12px; } }
        </style>
      </head>
      <body>
        <header>
          <div class="wrap">
            <a class="brand" href="/"><img src="/logo.png" alt=""/>Eco Tax Pay</a>
            <h1>XML Sitemap</h1>
            <p>This sitemap lists the pages on Eco Tax Pay for search engines to crawl. Learn more about <a href="https://www.sitemaps.org/" rel="noreferrer">XML sitemaps</a>.</p>
          </div>
        </header>
        <main class="wrap">
          <xsl:choose>
            <xsl:when test="$isIndex">
              <div class="bar">
                <p>This index references <strong><xsl:value-of select="count(s:sitemapindex/s:sitemap)"/></strong> sitemaps.</p>
                <input id="filter" type="search" placeholder="Filter sitemaps…" aria-label="Filter sitemaps"/>
              </div>
              <table>
                <thead><tr><th>Sitemap</th><th class="r">Last modified</th></tr></thead>
                <tbody>
                  <xsl:for-each select="s:sitemapindex/s:sitemap">
                    <tr>
                      <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                      <td class="r muted"><xsl:value-of select="concat(substring(s:lastmod,1,10),' ',substring(s:lastmod,12,5))"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:when>
            <xsl:otherwise>
              <div class="bar">
                <p>This sitemap contains <strong><xsl:value-of select="count(s:urlset/s:url)"/></strong> URLs. <a href="/sitemap.xml" style="color:var(--accent)">← Sitemap index</a></p>
                <input id="filter" type="search" placeholder="Filter URLs…" aria-label="Filter URLs"/>
              </div>
              <table>
                <thead><tr><th>URL</th><th class="r hide-sm">Priority</th><th class="r hide-sm">Change frequency</th><th class="r">Last modified</th></tr></thead>
                <tbody>
                  <xsl:for-each select="s:urlset/s:url">
                    <tr>
                      <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                      <td class="r muted hide-sm"><xsl:value-of select="s:priority"/></td>
                      <td class="r muted hide-sm"><xsl:value-of select="s:changefreq"/></td>
                      <td class="r muted"><xsl:value-of select="concat(substring(s:lastmod,1,10),' ',substring(s:lastmod,12,5))"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:otherwise>
          </xsl:choose>
          <footer>Generated by Eco Tax Pay. <a href="/">ecotaxpay.com</a></footer>
        </main>
        <script>
          document.getElementById("filter").addEventListener("input", function (e) {
            var q = e.target.value.toLowerCase();
            document.querySelectorAll("tbody tr").forEach(function (tr) {
              tr.style.display = tr.textContent.toLowerCase().indexOf(q) &gt; -1 ? "" : "none";
            });
          });
        </script>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
