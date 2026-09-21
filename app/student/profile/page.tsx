import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { revalidatePath } from "next/cache";

const INTERESTS = [
  "movies", "books", "series", "music", "singers", "travel", "work", "sport", "games", "fashion", "cooking", "other"
] as const;
const INTEREST_LABEL: Record<string, string> = {
  movies: "Filmes", books: "Livros", series: "Séries", music: "Músicas", singers: "Cantores",
  travel: "Viagens", work: "Trabalho", sport: "Esporte", games: "Games", fashion: "Moda",
  cooking: "Culinária", other: "Outro"
};

const GOALS = ["work", "travel", "studies", "conversation", "personal_life", "other"] as const;
const GOAL_LABEL: Record<string, string> = {
  work: "Trabalho", travel: "Viagens", studies: "Estudos", conversation: "Conversação",
  personal_life: "Vida pessoal", other: "Outro"
};

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: interests } = await supabase.from("student_interests").select("interest").eq("student_id", user.id);
  const { data: goals } = await supabase.from("student_goals").select("goal").eq("student_id", user.id);

  const selectedInterests = new Set((interests ?? []).map((i) => i.interest));
  const selectedGoals = new Set((goals ?? []).map((g) => g.goal));

  async function updateProfile(formData: FormData) {
    "use server";
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    const fullName = String(formData.get("full_name") ?? "");
    await supabase.from("profiles").update({ full_name: fullName, updated_at: new Date().toISOString() }).eq("id", user.id);

    const chosenInterests = formData.getAll("interests") as string[];
    await supabase.from("student_interests").delete().eq("student_id", user.id);
    if (chosenInterests.length) {
      await supabase.from("student_interests").insert(
        chosenInterests.map((interest) => ({ student_id: user.id, interest }))
      );
    }

    const chosenGoals = formData.getAll("goals") as string[];
    await supabase.from("student_goals").delete().eq("student_id", user.id);
    if (chosenGoals.length) {
      await supabase.from("student_goals").insert(chosenGoals.map((goal) => ({ student_id: user.id, goal })));
    }

    revalidatePath("/student/profile");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="student" active="/student/profile" />
      <main className="flex-1 px-8 py-8 md:px-12">
        <h1 className="font-display text-3xl text-brand-ink">Meu perfil</h1>
        <p className="mt-1 text-brand-ink/60">
          Seus interesses e objetivos ajudam sua professora a personalizar as aulas.
        </p>

        <form action={updateProfile} className="mt-8 max-w-2xl space-y-8">
          <div className="rounded-xl2 border border-brand-ink/10 bg-white p-6">
            <label className="text-sm text-brand-ink/70">Nome completo</label>
            <input
              name="full_name"
              defaultValue={profile?.full_name ?? ""}
              className="mt-1 w-full rounded-lg border border-brand-ink/15 px-3 py-2 outline-none focus:border-brand-purple"
            />
            <p className="mt-4 text-sm text-brand-ink/50">
              Nível CEFR atual: <span className="font-medium text-brand-purple">{profile?.cefr_level ?? "A1"}</span>
            </p>
          </div>

          <div className="rounded-xl2 border border-brand-ink/10 bg-white p-6">
            <p className="mb-3 text-sm font-medium text-brand-ink/70">Interesses</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => (
                <label
                  key={interest}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-brand-ink/15 px-4 py-2 text-sm has-[:checked]:border-brand-purple has-[:checked]:bg-brand-lilac/20"
                >
                  <input
                    type="checkbox"
                    name="interests"
                    value={interest}
                    defaultChecked={selectedInterests.has(interest)}
                    className="accent-brand-purple"
                  />
                  {INTEREST_LABEL[interest]}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl2 border border-brand-ink/10 bg-white p-6">
            <p className="mb-3 text-sm font-medium text-brand-ink/70">Objetivos com o inglês</p>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((goal) => (
                <label
                  key={goal}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-brand-ink/15 px-4 py-2 text-sm has-[:checked]:border-brand-purple has-[:checked]:bg-brand-lilac/20"
                >
                  <input
                    type="checkbox"
                    name="goals"
                    value={goal}
                    defaultChecked={selectedGoals.has(goal)}
                    className="accent-brand-purple"
                  />
                  {GOAL_LABEL[goal]}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="rounded-full bg-brand-purple px-8 py-3 text-white transition hover:bg-brand-lilacDark"
          >
            Salvar alterações
          </button>
        </form>
      </main>
    </div>
  );
}
