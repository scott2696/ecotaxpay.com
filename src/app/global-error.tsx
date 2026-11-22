"use client";

// Last-resort fallback if the whole layout fails (keeps users off a blank "Application error" page).
export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#050506", color: "#e8e8ea", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#9a9ca3", fontSize: 14, maxWidth: 380 }}>The page couldn&apos;t finish loading, often because the site was just updated. Reloading usually fixes it.</p>
          <button onClick={() => location.reload()} style={{ background: "#e8e8ea", color: "#050506", border: 0, borderRadius: 12, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}>
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
