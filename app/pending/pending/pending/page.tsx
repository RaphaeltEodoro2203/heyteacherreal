import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PendingPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("status, full_name").eq("id", user.id).single();

  const wasRejected = profile?.status === "rejected";

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-6">
      <div className="w-full max-w-md rounded-xl2 border border-brand-ink/10 bg-white p-8 text-center shadow-sm">
        <span className="font-display text-xl text-brand-purple">Hey Teacher!</span>

        {wasRejected ? (
          <>
            <h1 className="mt-6 font-display text-2xl text-brand-ink">Solicitação não aprovada</h1>
            <p className="mt-3 text-brand-ink/60">
              Sua professora ainda não liberou seu acesso. Entre em contato com ela diretamente para mais
              informações.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 font-display text-2xl text-brand-ink">Quase lá, {profile?.full_name?.split(" ")[0] || ""}!</h1>
            <p className="mt-3 text-brand-ink/60">
              Sua conta foi criada e está aguardando aprovação da sua professora. Assim que ela liberar seu
              acesso, você poderá entrar normalmente.
            </p>
          </>
        )}

        <form action="/api/auth/signout" method="post" className="mt-6">
          <button className="text-sm text-brand-ink/50 underline hover:text-brand-purple">Sair</button>
        </form>
      </div>
    </main>
  );
}
