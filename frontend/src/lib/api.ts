const API_BASE = import.meta.env.VITE_API_URL as string;

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

const K_ACCESS = "accessToken";
const K_REFRESH = "refreshToken";

export function saveSession(s: Session) {
  localStorage.setItem(K_ACCESS, s.accessToken);
  localStorage.setItem(K_REFRESH, s.refreshToken);
}

export function clearSession() {
  localStorage.removeItem(K_ACCESS);
  localStorage.removeItem(K_REFRESH);
}

export const hasSession = () => !!localStorage.getItem(K_ACCESS);

let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem(K_REFRESH);
  if (!refreshToken) return false;
  refreshing ??= fetch(`${API_BASE}/api/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (r) => {
      if (!r.ok) return false;
      saveSession(await r.json());
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const send = () => {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const token = localStorage.getItem(K_ACCESS);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${API_BASE}${path}`, { ...init, headers }).catch(() => {
      throw new Error("Can't reach OptiFolio right now. Check your internet connection and try again.");
    });
  };

  let res = await send();
  if (res.status === 401 && localStorage.getItem(K_REFRESH)) {
    if (await refresh()) res = await send();
    else {
      clearSession();
      window.dispatchEvent(new Event("auth:expired"));
    }
  }
  return res;
}
