export const ALLOC_COLORS = [
  "hsl(var(--brand))",
  "#8ea2ff",
  "hsl(var(--foreground))",
  "#9a9a95",
  "#c7d0ff",
  "#5b5b60",
  "#3b56d9",
  "#d9d9d4",
];

export const allocColor = (i: number) => ALLOC_COLORS[i % ALLOC_COLORS.length];

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export const READ_KEY = "learn_read_v1";

export function readLessons(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function resetLessons() {
  try {
    localStorage.removeItem(READ_KEY);
  } catch {
    /* storage blocked */
  }
}

export function markLessonRead(slug: string) {
  const s = new Set(readLessons());
  s.add(slug);
  localStorage.setItem(READ_KEY, JSON.stringify([...s]));
}
