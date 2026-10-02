import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  GitFork,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Trash2,
  X,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  fetchComments,
  fetchPosts,
  forkToOptimizer,
  timeAgo,
  toggleLike,
  type Comment,
  type Post,
  type SharedPortfolio,
} from "@/features/community/api";
import { api } from "@/lib/api";
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Menu,
  PALETTE,
  Segmented,
  Select,
  Skeleton,
  StackBar,
  Textarea,
  buttonClass,
  toast,
} from "@/ui";
import { cn } from "@/lib/utils";

const MAX = 1000;

const PortfolioChip: React.FC<{ p: SharedPortfolio; onFork?: () => void }> = ({
  p,
  onFork,
}) => {
  const hs = [...p.holdings].sort((a, b) => b.weight - a.weight);
  return (
    <div className="mt-4 rounded-2xl bg-foreground/[0.03] p-4 ring-1 ring-inset ring-[var(--hairline)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-medium">{p.name}</div>
          <div className="text-[12px] text-muted-foreground">
            {hs.length} stocks{p.risk ? ` · ${p.risk}` : ""}
          </div>
        </div>
        {onFork && (
          <Button variant="secondary" size="sm" onClick={onFork}>
            <GitFork size={13} /> Fork
          </Button>
        )}
      </div>
      <StackBar
        className="mt-3"
        height={8}
        items={hs.map((h, i) => ({
          label: h.ticker,
          value: h.weight,
          color: PALETTE[i % PALETTE.length],
        }))}
      />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        {hs.slice(0, 8).map((h, i) => (
          <span key={h.ticker} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="font-medium">{h.ticker}</span>
            <span className="num text-muted-foreground">
              {h.weight.toFixed(1)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

const Composer: React.FC<{ onPosted: () => void }> = ({ onPosted }) => {
  const { userId, userName } = useAuth();
  const [body, setBody] = useState("");
  const [options, setOptions] = useState<
    { value: string; label: string; portfolio: SharedPortfolio }[]
  >([]);
  const [attached, setAttached] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    api(`/api/userPortfolios/${userId}`)
      .then((r) => r.json())
      .then((d) => {
        const groups: {
          sessionId: string;
          date: string;
          tickers: { ticker: string; allocation: number }[];
        }[] = d.portfolioGroups || [];
        setOptions(
          groups.map((g) => {
            const label = `Portfolio from ${new Date(g.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
            return {
              value: g.sessionId,
              label,
              portfolio: {
                name: label,
                holdings: g.tickers.map((t) => ({
                  ticker: t.ticker,
                  weight: t.allocation,
                })),
              },
            };
          }),
        );
      })
      .catch(() => setOptions([]));
  }, [userId]);

  const [anon, setAnon] = useState(false);
  const chosen = options.find((o) => o.value === attached);

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await createPost(body.trim(), chosen?.portfolio ?? null, anon);
      setBody("");
      setAttached(null);
      setPicking(false);
      onPosted();
      toast.success("Posted");
    } catch (e) {
      toast.error("Could not post", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        <Avatar name={userName || "You"} anonymous={anon} size={32} />
        <div className="min-w-0 text-[12.5px] text-muted-foreground">
          Posting as{" "}
          <span className="font-medium text-foreground">
            {anon ? "Anonymous" : userName || "you"}
          </span>
        </div>
      </div>
      <Textarea
        value={body}
        maxLength={MAX}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) =>
          (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()
        }
        placeholder="Share a portfolio, a question or what you learned from a result"
        aria-label="New post"
        className="mt-3 min-h-[120px] flex-1 bg-transparent"
      />
      {picking && (
        <div className="mt-3 flex items-center gap-2">
          <Select
            className="min-w-0 flex-1"
            value={attached}
            onChange={setAttached}
            options={options.map(({ value, label }) => ({ value, label }))}
            placeholder={
              options.length
                ? "Choose a saved portfolio"
                : "No saved portfolios yet"
            }
          />
          <Button
            variant="ghost"
            size="md"
            icon
            aria-label="Remove attachment"
            onClick={() => {
              setPicking(false);
              setAttached(null);
            }}
          >
            <X size={15} />
          </Button>
        </div>
      )}
      {chosen && <PortfolioChip p={chosen.portfolio} />}
      <div className="mt-3 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPicking(true)}
          disabled={picking || !options.length}
          title={
            options.length
              ? undefined
              : "Save a portfolio from the optimizer first"
          }
        >
          <Paperclip size={13} /> Attach portfolio
        </Button>
        <span
          className={cn(
            "num text-[12px]",
            body.length > MAX * 0.9
              ? "text-[var(--amber)]"
              : "text-muted-foreground",
          )}
        >
          {body.length ? `${body.length}/${MAX}` : ""}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--hairline)] pt-3">
        <AnonToggle value={anon} onChange={setAnon} />
        <Button
          variant="primary"
          size="sm"
          onClick={submit}
          loading={busy}
          disabled={!body.trim()}
        >
          Post
        </Button>
      </div>
    </Card>
  );
};

const AnonToggle: React.FC<{
  value: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}> = ({ value, onChange, compact }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    onClick={() => onChange(!value)}
    title={value ? "Your name is hidden" : "Post under your name"}
    className={cn(
      "inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-2.5 text-[12.5px] transition-colors",
      value
        ? "bg-foreground/[0.08] text-foreground"
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    <span
      className={cn(
        "relative h-4 w-7 rounded-full transition-colors",
        value ? "bg-brand" : "bg-foreground/15",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-[left] duration-200",
          value ? "left-[14px]" : "left-0.5",
        )}
      />
    </span>
    {compact ? "Anon" : "Anonymous"}
  </button>
);

const Comments: React.FC<{ postId: number; onCount: (n: number) => void }> = ({
  postId,
  onCount,
}) => {
  const { isLoggedIn, userId } = useAuth();
  const [items, setItems] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [anon, setAnon] = useState(false);

  const load = useCallback(
    () =>
      fetchComments(postId)
        .then((c) => {
          setItems(c);
          onCount(c.length);
        })
        .catch(() => setItems([])),
    [postId, onCount],
  );
  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await addComment(postId, text.trim(), anon);
      setText("");
      await load();
    } catch (e) {
      toast.error("Could not comment", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteComment(id);
      await load();
    } catch {
      toast.error("Could not delete that comment");
    }
  };

  return (
    <div className="mt-4 border-t border-[var(--hairline)] pt-4">
      {items === null ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {items.map((c) => (
            <li key={c.id} className="group flex gap-2.5">
              <Avatar name={c.author} anonymous={c.anonymous} size={26} />
              <div className="min-w-0 flex-1 rounded-2xl bg-foreground/[0.03] px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="font-medium">{c.author}</span>
                  <span className="text-muted-foreground">
                    {timeAgo(c.createdAt)}
                  </span>
                  {(c.mine ?? c.authorId === userId) && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      aria-label="Delete comment"
                      className="ml-auto text-muted-foreground transition-opacity hover:text-[var(--red)] focus-visible:opacity-100 group-hover:opacity-100 sm:opacity-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="mb-0 mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
          {!items.length && (
            <li className="text-[13px] text-muted-foreground">
              No comments yet.
            </li>
          )}
        </ul>
      )}
      {isLoggedIn ? (
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment"
            aria-label="Add a comment"
            className="h-9 flex-1 rounded-full bg-card px-4 text-[13.5px] outline-none ring-1 ring-inset ring-[var(--hairline)] focus:ring-2 focus:ring-brand"
          />
          <AnonToggle value={anon} onChange={setAnon} compact />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={busy}
            disabled={!text.trim()}
          >
            Reply
          </Button>
        </form>
      ) : (
        <p className="mb-0 mt-3 text-[12.5px] text-muted-foreground">
          <Link
            to="/SignIn?next=/Community"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>{" "}
          to reply.
        </p>
      )}
    </div>
  );
};

const PostCard: React.FC<{ post: Post; onDeleted: (id: number) => void }> = ({
  post,
  onDeleted,
}) => {
  const { isLoggedIn, userId } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(post.comments);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const like = async () => {
    if (!isLoggedIn) return navigate("/SignIn?next=/Community");
    setLiked((v) => !v);
    setLikes((n) => n + (liked ? -1 : 1));
    try {
      const r = await toggleLike(post.id);
      setLiked(r.liked);
    } catch {
      setLiked(post.liked);
      setLikes(post.likes);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deletePost(post.id);
      onDeleted(post.id);
      toast("Post deleted");
    } catch {
      toast.error("Could not delete the post");
    } finally {
      setDeleting(false);
      setConfirm(false);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card>
        <header className="flex items-center gap-3">
          <Avatar name={post.author} anonymous={post.anonymous} size={36} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[14px] font-medium">
              {post.author}
            </div>
            <div className="text-[12px] text-muted-foreground">
              {timeAgo(post.createdAt)}
            </div>
          </div>
          {(post.mine ?? post.authorId === userId) && (
            <Menu
              items={[
                {
                  label: "Delete post",
                  icon: <Trash2 size={14} />,
                  danger: true,
                  onSelect: () => setConfirm(true),
                },
              ]}
              trigger={(p) => (
                <Button
                  variant="ghost"
                  size="sm"
                  icon
                  aria-label="Post actions"
                  {...p}
                >
                  <MoreHorizontal size={16} />
                </Button>
              )}
            />
          )}
        </header>
        <p className="mb-0 mt-3.5 whitespace-pre-wrap text-[14.5px] leading-relaxed">
          {post.body}
        </p>
        {post.portfolio && (
          <PortfolioChip
            p={post.portfolio}
            onFork={() => {
              forkToOptimizer(post.portfolio!);
              navigate("/Optimizer");
            }}
          />
        )}
        <footer className="mt-4 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={like}
            aria-pressed={liked}
            className={cn(liked && "text-[var(--red)] hover:text-[var(--red)]")}
          >
            <Heart size={14} className={cn(liked && "fill-current")} />
            <span className="num">{likes}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <MessageSquare size={14} />
            <span className="num">{count}</span>
          </Button>
        </footer>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <Comments postId={post.id} onCount={setCount} />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={remove}
        loading={deleting}
        danger
        title="Delete this post?"
        description="Its comments and likes are removed too. This cannot be undone."
        confirmLabel="Delete"
      />
    </motion.article>
  );
};

const Summary: React.FC<{ posts: Post[] | null }> = ({ posts }) => {
  const list = posts ?? [];
  const items = [
    { label: "Posts", value: list.length },
    { label: "Portfolios shared", value: list.filter((p) => p.portfolio).length },
    { label: "Replies", value: list.reduce((s, p) => s + p.comments, 0) },
    { label: "Likes", value: list.reduce((s, p) => s + p.likes, 0) },
  ];
  return (
    <Card padded={false} className="grid shrink-0 grid-cols-2 gap-px overflow-hidden bg-[var(--hairline)]">
      {items.map((it) => (
        <div key={it.label} className="bg-card px-5 py-4">
          <div className="text-[12px] text-muted-foreground">{it.label}</div>
          <div className="num mt-1.5 text-[22px] font-medium leading-none tracking-[-0.03em]">{posts === null ? <Skeleton className="h-[22px] w-10" /> : it.value}</div>
        </div>
      ))}
    </Card>
  );
};

const MostShared: React.FC<{ posts: Post[] | null }> = ({ posts }) => {
  const shared = useMemo(() => {
    const tickers = new Map<string, number>();
    for (const p of posts ?? []) for (const h of p.portfolio?.holdings ?? []) tickers.set(h.ticker, (tickers.get(h.ticker) ?? 0) + 1);
    return [...tickers.entries()].sort((a, b) => b[1] - a[1]);
  }, [posts]);
  const top = shared[0]?.[1] ?? 1;

  return (
    <Card className="flex min-h-[180px] flex-1 flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[13.5px] font-medium tracking-[-0.01em]">Most shared stocks</div>
        {shared.length > 0 && <span className="num text-[12px] text-muted-foreground">{shared.length}</span>}
      </div>
      {shared.length ? (
        <div className="-mr-2 mt-3 max-h-60 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-2 lg:max-h-none">
          {shared.map(([ticker, n], i) => (
            <div key={ticker} className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-[12.5px]">
              <span className="truncate font-medium">{ticker}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                <span className="block h-full rounded-full" style={{ width: `${(n / top) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
              </span>
              <span className="num text-muted-foreground">
                {n} {n === 1 ? "post" : "posts"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-0 mt-3 text-[12.5px] leading-relaxed text-muted-foreground">{posts === null ? "Loading…" : "Attach a portfolio to a post and its stocks show up here."}</p>
      )}
    </Card>
  );
};

const Community: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [sort, setSort] = useState<"new" | "top">("new");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchPosts(sort)
      .then(setPosts)
      .catch((e: Error) => {
        setPosts([]);
        console.warn("[community]", e.message);
        setError("unavailable");
      });
  }, [sort]);

  useEffect(() => {
    setPosts(null);
    load();
  }, [load]);

  return (
    <AppShell
      title="Community"
      description="Share portfolios, ask questions and fork other people’s ideas into your own optimizer run. Be kind; nothing here is advice."
      actions={
        <Segmented
          value={sort}
          onChange={setSort}
          options={[
            { value: "new", label: "New" },
            { value: "top", label: "Top" },
          ]}
        />
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:min-h-[360px] lg:grid-cols-[minmax(0,1fr)_380px]">
          {isLoggedIn ? (
            <Composer onPosted={load} />
          ) : (
            <Card className="flex flex-col items-start justify-center gap-4">
              <div>
                <div className="text-[14px] font-medium">
                  Join the conversation
                </div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">
                  Sign in to post, like and reply.
                </div>
              </div>
              <Link
                to="/SignIn?next=/Community"
                className={buttonClass("primary", "sm")}
              >
                Sign in
              </Link>
            </Card>
          )}
          {/* Right column takes the composer's height; the stock list scrolls inside it. */}
          <div className="relative">
            <div className="flex flex-col gap-4 lg:absolute lg:inset-0">
              <Summary posts={posts} />
              <MostShared posts={posts} />
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {error ? (
            <EmptyState
              title="Posts are not loading right now"
              description="Please try again in a moment."
              action={<Button onClick={load}>Retry</Button>}
            />
          ) : posts === null ? (
            [0, 1, 2].map((i) => (
              <Card key={i}>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </Card>
            ))
          ) : posts.length ? (
            <AnimatePresence mode="popLayout">
              {posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onDeleted={(id) =>
                    setPosts((ps) => (ps ?? []).filter((x) => x.id !== id))
                  }
                />
              ))}
            </AnimatePresence>
          ) : (
            <EmptyState
              title="No posts yet"
              description="Be the first: share a saved portfolio and what you think of it."
            />
          )}
        </div>

      </div>
    </AppShell>
  );
};

export default Community;
