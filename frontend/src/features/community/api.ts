import { api } from "@/lib/api";
const CART_KEY = "portfolioCart_v1";

export interface SharedHolding {
  ticker: string;
  weight: number;
}

export interface SharedPortfolio {
  name: string;
  risk?: string;
  holdings: SharedHolding[];
}

export interface Post {
  id: number;
  authorId: string | null;
  author: string;
  anonymous?: boolean;
  mine?: boolean;
  body: string;
  portfolio: SharedPortfolio | null;
  createdAt: string;
  likes: number;
  liked: boolean;
  comments: number;
}

export interface Comment {
  id: number;
  authorId: string | null;
  author: string;
  anonymous?: boolean;
  mine?: boolean;
  body: string;
  createdAt: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await api(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500) {
      console.warn("[community]", data.error ?? res.status);
      throw new Error("Something went wrong on our side. Please try again.");
    }
    throw new Error(data.error ?? "That didn't go through. Please try again.");
  }
  return data as T;
}

export const fetchPosts = (sort: "new" | "top") => call<{ posts: Post[] }>(`/api/community/posts?sort=${sort}`).then((r) => r.posts);

export const createPost = (body: string, portfolio: SharedPortfolio | null, anonymous = false) =>
  call<{ id: number }>("/api/community/posts", { method: "POST", body: JSON.stringify({ body, portfolio, anonymous }) });

export const toggleLike = (postId: number) => call<{ liked: boolean }>(`/api/community/posts/${postId}/like`, { method: "POST" });

export const deletePost = (postId: number) => call<{ ok: true }>(`/api/community/posts/${postId}`, { method: "DELETE" });

export const deleteComment = (commentId: number) => call<{ ok: true }>(`/api/community/comments/${commentId}`, { method: "DELETE" });

export const fetchComments = (postId: number) =>
  call<{ comments: Comment[] }>(`/api/community/posts/${postId}/comments`).then((r) => r.comments);

export const addComment = (postId: number, body: string, anonymous = false) =>
  call<{ ok: true }>(`/api/community/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ body, anonymous }) });

export function forkToOptimizer(p: SharedPortfolio) {
  localStorage.setItem(CART_KEY, JSON.stringify(p.holdings.map((h) => h.ticker)));
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
