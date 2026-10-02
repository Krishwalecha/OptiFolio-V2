import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { AuthLayout, safeNext } from "@/components/site/AuthAside";
import { useAuth } from "@/context/AuthContext";
import { Button, Field, Input } from "@/ui";

const API_BASE = import.meta.env.VITE_API_URL;

export async function signIn(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/signin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Sign in failed.");
  if (!data.userId || !data.email) throw new Error("Unexpected response from the server.");
  return data as { userId: string; email: string; name: string; accessToken: string; refreshToken: string; expiresAt: number };
}

const SignIn: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { search } = useLocation();
  const { login } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Enter your email and password.");
    setLoading(true);
    try {
      const d = await signIn(email.trim(), password);
      login(d.userId, d.email, d.name, { accessToken: d.accessToken, refreshToken: d.refreshToken, expiresAt: d.expiresAt });
      navigate(safeNext(search), { replace: true });
    } catch (err) {
      setError(err instanceof TypeError ? "Could not reach the server. Check your connection." : err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          New here?{" "}
          <Link to={`/SignUp${search}`} className="text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="email" inputSize="lg" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />}</Field>
        <Field label="Password">
          {(id) => (
            <Input
              id={id}
              type={show ? "text" : "password"}
              autoComplete="current-password"
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
        {error && (
          <p role="alert" className="m-0 rounded-xl bg-[var(--red-subtle)] px-3.5 py-2.5 text-[13px] text-[var(--red)]">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
};

export default SignIn;
