import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { SkillBar } from "@/components/SkillBar";

const SKILLS = ["speaking", "listening", "reading", "writing"] as const;
const SKILL_LABEL: Record<(typeof SKILLS)[number], string> = {
  speaking: "Speaking",
  listening: "Listening",
  reading: "Reading",
  writing: "Writing"
};

export default async function StudentDashboard() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const { data: attempts } = await supabase
    .from("activity_attempts")
    .select("score, submitted_at, activities(skill)")
    .eq("student_id", user.id)
    .eq("is_first_attempt", true);

  const skillAverages: Record<string, number> = {};
  for (const skill of SKILLS) {
    const relevant = (attempts ?? []).filter((a: any) => a.activities?.skill === skill && a.score != null);
    skillAverages[skill] = relevant.length
      ? relevant.reduce((sum: number, a: any) => sum + Number(a.score), 0) / relevant.length
      : 0;
  }
  const overall = SKILLS.reduce((sum, s) => sum + skillAverages[s], 0) / SKILLS.length;

  const { count: pendingCount } = await supabase
    .from("activities")
    .select("*", { count: "exact", head: true })
    .eq("level", profile?.cefr_level ?? "A1");

  const { count: doneCount } = await supabase
    .from("activity_attempts")
    .select("*", { count: "exact", head: true })
    .eq("student_id", user.id)
    .eq("is_first_attempt", true);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="student" active="/student/dashboard" />
      <main className="flex-1 px-8 py-8 md:px-12">
        <h1 className="font-display text-3xl text-brand-ink">
          Olá, {profile?.full_name?.split(" ")[0] || "aluno"} 👋
        </h1>
        <p className="mt-1 text-brand-ink/60">Aqui está sua evolução no inglês.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl2 border border-brand-ink/10 bg-white p-6">
            <p className="text-sm text-brand-ink/50">Nível atual (CEFR)</p>
            <p className="mt-2 font-display text-4xl text-brand-purple">{profile?.cefr_level ?? "A1"}</p>
          </div>
          <div className="rounded-xl2 border border-brand-ink/10 bg-white p-6">
            <p className="text-sm text-brand-ink/50">Desempenho geral</p>
            <p className="mt-2 font-display text-4xl text-brand-ink">{Math.round(overall)}%</p>
          </div>
          <div className="rounded-xl2 border border-brand-ink/10 bg-white p-6">
            <p className="text-sm text-brand-ink/50">Atividades feitas</p>
            <p className="mt-2 font-display text-4xl text-brand-ink">
              {doneCount ?? 0}
              <span className="text-lg text-brand-ink/40"> / {pendingCount ?? 0}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl2 border border-brand-ink/10 bg-white p-6">
          <p className="mb-4 text-sm font-medium text-brand-ink/70">Desempenho por habilidade</p>
          <div className="space-y-4">
            {SKILLS.map((skill) => (
              <SkillBar key={skill} label={SKILL_LABEL[skill]} percent={skillAverages[skill]} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
