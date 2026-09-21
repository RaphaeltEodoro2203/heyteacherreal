"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role, full_name: fullName } }
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.refresh();
    router.push(role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-6">
      <div className="w-full max-w-md rounded-xl2 border border-brand-ink/10 bg-white p-8 shadow-sm">
        <Link href="/" className="font-display text-xl text-brand-purple">
          Hey Teacher!
        </Link>

        <h1 className="mt-6 font-display text-2xl text-brand-ink">
          {mode === "login" ? "Entrar na sua conta" : "Criar conta"}
        </h1>

        {mode === "signup" && (
          <div className="mt-6 flex rounded-full bg-brand-cream p-1 text-sm">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`flex-1 rounded-full py-2 transition ${
                role === "student" ? "bg-brand-purple text-white" : "text-brand-ink/60"
              }`}
            >
              Sou aluno(a)
            </button>
            <button
              type="button"
              onClick={() => setRole("teacher")}
              className={`flex-1 rounded-full py-2 transition ${
                role === "teacher" ? "bg-brand-purple text-white" : "text-brand-ink/60"
              }`}
            >
              Sou professora
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm text-brand-ink/70">Nome completo</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-brand-ink/15 px-3 py-2 outline-none focus:border-brand-purple"
              />
            </div>
          )}
          <div>
            <label className="text-sm text-brand-ink/70">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-ink/15 px-3 py-2 outline-none focus:border-brand-purple"
            />
          </div>
          <div>
            <label className="text-sm text-brand-ink/70">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-ink/15 px-3 py-2 outline-none focus:border-brand-purple"
            />
          </div>

          {error && <p className="text-sm text-brand-red">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand-purple py-3 text-white transition hover:bg-brand-lilacDark disabled:opacity-50"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-6 w-full text-center text-sm text-brand-ink/60 hover:text-brand-purple"
        >
          {mode === "login" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
