import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff } from "lucide-react";
import { AuthLayout, safeNext } from "@/components/site/AuthAside";
import { useAuth } from "@/context/AuthContext";
import { signIn } from "./SignIn";
import { Button, Field, Input } from "@/ui";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL;

const RULES = [
  { test: (p: string) => p.length >= 8, label: "8 or more characters" },
  { test: (p: string) => /\d/.test(p) && /[a-z]/i.test(p), label: "Letters and numbers" },
];

const SignUp: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { search } = useLocation();
  const { login } = useAuth();
  const strong = RULES.every((r) => r.test(password));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password) return setError("Fill in all three fields.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("That email address does not look right.");
    if (!strong) return setError("Choose a password with at least 8 characters, using letters and numbers.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sign up failed.");
      const d = await signIn(email.trim(), password);
      login(d.userId, d.email, d.name, { accessToken: d.accessToken, refreshToken: d.refreshToken, expiresAt: d.expiresAt });
      navigate(safeNext(search), { replace: true });
    } catch (err) {
      setError(err instanceof TypeError ? "Could not reach the server. Check your connection." : err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have one?{" "}
          <Link to={`/SignIn${search}`} className="text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Name">{(id) => <Input id={id} autoComplete="name" inputSize="lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />}</Field>
        <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="email" inputSize="lg" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />}</Field>
        <Field label="Password">
          {(id) => (
            <Input
              id={id}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              inputSize="lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              suffix={
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="grid h-7 w-7 place-items-center rounded-md hover:text-foreground">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
          )}
        </Field>
        <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0">
          {RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.label} className={cn("flex items-center gap-1.5 text-[12px] transition-colors", ok ? "text-[var(--green)]" : "text-muted-foreground")}>
                <Check size={12} className={cn("transition-opacity", ok ? "opacity-100" : "opacity-30")} />
                {r.label}
              </li>
            );
          })}
        </ul>
        {error && (
          <p role="alert" className="m-0 rounded-xl bg-[var(--red-subtle)] px-3.5 py-2.5 text-[13px] text-[var(--red)]">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
};

export default SignUp;
