// lib/fetchWithTimeout.ts
export async function fetchWithTimeout(
  url: string,
  ms = 10000,
  init?: RequestInit
) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
