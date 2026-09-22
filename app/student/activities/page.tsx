import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";

const SKILL_LABEL: Record<string, string> = {
  speaking: "Speaking", listening: "Listening", reading: "Reading", writing: "Writing"
};

export default async function ActivitiesPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("cefr_level").eq("id", user.id).single();

  const { data: assignments } = await supabase
    .from("student_assignments")
    .select("activity_id, activities(id, title, skill, level, book, unit_number, lesson_number)")
    .eq("student_id", user.id);

  const activities = (assignments ?? [])
    .map((a: any) => a.activities)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.unit_number ?? 0) - (b.unit_number ?? 0));

  const { data: attempts } = await supabase
    .from("activity_attempts")
    .select("activity_id, attempt_number, score")
    .eq("student_id", user.id);

  const attemptsByActivity = new Map<string, { count: number; bestScore: number | null }>();
  for (const a of attempts ?? []) {
    const current = attemptsByActivity.get(a.activity_id) ?? { count: 0, bestScore: null };
    current.count += 1;
    if (a.score != null) current.bestScore = Math.max(current.bestScore ?? 0, Number(a.score));
    attemptsByActivity.set(a.activity_id, current);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="student" active="/student/activities" />
      <main className="flex-1 px-8 py-8 md:px-12">
        <h1 className="font-display text-3xl text-brand-ink">Atividades</h1>
        <p className="mt-1 text-brand-ink/60">Nível {profile?.cefr_level ?? "A1"} · até 3 tentativas por atividade.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(activities ?? []).map((activity) => {
            const state = attemptsByActivity.get(activity.id);
            const attemptsLeft = 3 - (state?.count ?? 0);
            return (
              <Link
                key={activity.id}
                href={`/student/activities/${activity.id}`}
                className="rounded-xl2 border border-brand-ink/10 bg-white p-5 transition hover:border-brand-purple"
              >
                <p className="text-xs uppercase tracking-wide text-brand-lilacDark">
                  {SKILL_LABEL[activity.skill]} · {activity.book ?? "Geral"}
                </p>
                <p className="mt-2 font-medium text-brand-ink">{activity.title}</p>
                <p className="mt-3 text-sm text-brand-ink/50">
                  {state?.bestScore != null
                    ? `Melhor resultado: ${Math.round(state.bestScore)}%`
                    : "Ainda não realizada"}
                  {attemptsLeft <= 0 && " · Tentativas esgotadas"}
                </p>
              </Link>
            );
          })}
          {(activities ?? []).length === 0 && (
            <p className="text-brand-ink/50">
              Sua professora ainda não liberou nenhuma atividade pra você. Assim que ela atribuir, elas
              aparecem aqui automaticamente.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
