const TRACKERS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref",
  "ref_src",
]);

export function normalizeUrl(raw: string) {
  try {
    const u = new URL(raw);

    // Lowercase host; strip default ports
    u.hostname = u.hostname.toLowerCase();
    if (
      (u.protocol === "http:" && u.port === "80") ||
      (u.protocol === "https:" && u.port === "443")
    )
      u.port = "";

    // Remove known tracking params; keep meaningful query params
    for (const k of Array.from(u.searchParams.keys())) {
      if (k.startsWith("utm_") || TRACKERS.has(k)) u.searchParams.delete(k);
    }

    // Sort remaining params for stability
    const entries = Array.from(u.searchParams.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    u.search = "";
    for (const [k, v] of entries) u.searchParams.append(k, v);

    // Drop hash
    u.hash = "";

    // Normalize trailing slash on bare path (optional)
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }

    return u.toString();
  } catch {
    return raw;
  }
}
