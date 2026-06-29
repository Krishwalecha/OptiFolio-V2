export interface NavEntry {
  date: string;
  nav: number;
}

const NAV_CACHE_TTL = 24 * 60 * 60 * 1000;

export function readNavCache(schemeCode: number): NavEntry[] | null {
  try {
    const raw = localStorage.getItem(`mf_nav_${schemeCode}`);
    if (!raw) return null;
    const { data, fetchedAt } = JSON.parse(raw);
    if (Date.now() - fetchedAt > NAV_CACHE_TTL) return null;
    return data as NavEntry[];
  } catch {
    return null;
  }
}

export function writeNavCache(schemeCode: number, data: NavEntry[]) {
  try {
    localStorage.setItem(`mf_nav_${schemeCode}`, JSON.stringify({ data, fetchedAt: Date.now() }));
  } catch {}
}

export function parseNavDate(s: string): Date {
  const [d, m, y] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
