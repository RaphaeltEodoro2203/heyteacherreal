import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { SkillBar } from "@/components/SkillBar";
import { revalidatePath } from "next/cache";

const SKILLS = ["speaking", "listening", "reading", "writing"] as const;
const SKILL_LABEL: Record<string, string> = {
  speaking: "Speaking", listening: "Listening", reading: "Reading", writing: "Writing"
};

export default async function StudentDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { skill?: string };
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase.from("profiles").select("*").eq("id", params.id).single();
  if (!student) notFound();

  let attemptsQuery = supabase
    .from("activity_attempts")
    .select("score, submitted_at, activities(skill, title, level)")
    .eq("student_id", params.id)
    .eq("is_first_attempt", true);

  const { data: allAttempts } = await attemptsQuery;

  const skillAverages: Record<string, number> = {};
  for (const skill of SKILLS) {
    const relevant = (allAttempts ?? []).filter((a: any) => a.activities?.skill === skill && a.score != null);
    skillAverages[skill] = relevant.length
      ? relevant.reduce((sum: number, a: any) => sum + Number(a.score), 0) / relevant.length
      : 0;
  }

  const filteredAttempts = searchParams.skill
    ? (allAttempts ?? []).filter((a: any) => a.activities?.skill === searchParams.skill)
    : allAttempts ?? [];

  const { data: notes } = await supabase
    .from("teacher_notes")
    .select("*")
    .eq("student_id", params.id)
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const { data: placement } = await supabase
    .from("placement_tests")
    .select("*")
    .eq("student_id", params.id)
    .maybeSingle();

  async function saveSpeakingNotes(formData: FormData) {
    "use server";
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const notes = String(formData.get("speaking_notes") ?? "");
    const placementId = String(formData.get("placement_id"));
    await supabase
      .from("placement_tests")
      .update({ speaking_notes: notes, assigned_by: user.id })
      .eq("id", placementId);
    revalidatePath(`/teacher/students/${params.id}`);
  }
  async function addNote(formData: FormData) {
    "use server";
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const note = String(formData.get("note") ?? "").trim();
    if (!note) return;
    await supabase.from("teacher_notes").insert({ teacher_id: user.id, student_id: params.id, note });
    revalidatePath(`/teacher/students/${params.id}`);
  }

  async function updateLevel(formData: FormData) {
    "use server";
    const supabase = createClient();
    const level = String(formData.get("cefr_level"));
    await supabase.from("profiles").update({ cefr_level: level }).eq("id", params.id);
    revalidatePath(`/teacher/students/${params.id}`);
  }

  async function sendNotification(formData: FormData) {
    "use server";
    const supabase = createClient();
    const message = String(formData.get("message") ?? "").trim();
    if (!message) return;
    await supabase.from("notifications").insert({ profile_id: params.id, message });
    revalidatePath(`/teacher/students/${params.id}`);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="teacher" active="/teacher/dashboard" />
      <main className="flex-1 px-8 py-8 md:px-12">
        <h1 className="font-display text-3xl text-brand-ink">{student.full_name}</h1>
        <p className="mt-1 text-brand-ink/60">Nível CEFR: {student.cefr_level}</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl2 border border-brand-ink/10 bg-white p-6">
            <p className="mb-4 text-sm font-medium text-brand-ink/70">Desempenho por habilidade</p>
            <div className="space-y-4">
              {SKILLS.map((skill) => (
                <SkillBar key={skill} label={SKILL_LABEL[skill]} percent={skillAverages[skill]} />
              ))}
            </div>

            <form action={updateLevel} className="mt-6 flex items-center gap-2">
              <select
                name="cefr_level"
                defaultValue={student.cefr_level}
                className="rounded-lg border border-brand-ink/15 px-3 py-2 text-sm"
              >
                {["A1", "A2", "B1", "B2", "C1"].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-full bg-brand-purple px-4 py-2 text-sm text-white">
                Atualizar nível
              </button>
            </form>
          </div>

          <div className="rounded-xl2 border border-brand-ink/10 bg-white p-6">
            <p className="mb-3 text-sm font-medium text-brand-ink/70">Notas privadas</p>
            <form action={addNote} className="mb-4 flex gap-2">
              <input
                name="note"
                placeholder="Adicionar observação..."
                className="flex-1 rounded-lg border border-brand-ink/15 px-3 py-2 text-sm outline-none focus:border-brand-purple"
              />
              <button type="submit" className="rounded-full bg-brand-purple px-4 py-2 text-sm text-white">
                Salvar
              </button>
            </form>
            <ul className="space-y-2 text-sm text-brand-ink/70">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="rounded-lg bg-brand-cream px-3 py-2">
                  {n.note}
                </li>
              ))}
              {(notes ?? []).length === 0 && <p className="text-brand-ink/40">Nenhuma nota ainda.</p>}
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-xl2 border border-brand-ink/10 bg-white p-6">
          <p className="mb-3 text-sm font-medium text-brand-ink/70">Enviar notificação para o aluno</p>
          <form action={sendNotification} className="flex gap-2">
            <input
              name="message"
              placeholder="Ex: Não esqueça de fazer a atividade de Writing até sexta!"
              className="flex-1 rounded-lg border border-brand-ink/15 px-3 py-2 text-sm outline-none focus:border-brand-purple"
            />
            <button type="submit" className="rounded-full bg-brand-purple px-4 py-2 text-sm text-white">
              Enviar
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-xl2 border border-brand-ink/10 bg-white p-6">
          <p className="mb-3 text-sm font-medium text-brand-ink/70">Teste de nivelamento (placement test)</p>
          {placement ? (
            <>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-brand-ink/50">Reading</p>
                  <p className="font-display text-xl text-brand-ink">{Math.round(Number(placement.reading_score ?? 0))}%</p>
                </div>
                <div>
                  <p className="text-xs text-brand-ink/50">Writing</p>
                  <p className="font-display text-xl text-brand-ink">{Math.round(Number(placement.writing_score ?? 0))}%</p>
                </div>
                <div>
                  <p className="text-xs text-brand-ink/50">Listening</p>
                  <p className="font-display text-xl text-brand-ink">{Math.round(Number(placement.listening_score ?? 0))}%</p>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-brand-ink/50">
                Nível sugerido pelo teste: <span className="font-medium text-brand-purple">{placement.level_assigned}</span>
              </p>

              <form action={saveSpeakingNotes} className="mt-5">
                <input type="hidden" name="placement_id" value={placement.id} />
                <label className="mb-2 block text-xs font-medium text-brand-ink/70">
                  Avaliação de Speaking (feita ao vivo por você)
                </label>
                <textarea
                  name="speaking_notes"
                  defaultValue={placement.speaking_notes ?? ""}
                  rows={3}
                  placeholder="Ex: Boa fluência, mas precisa trabalhar pronúncia de verbos irregulares."
                  className="w-full rounded-lg border border-brand-ink/15 px-3 py-2 text-sm outline-none focus:border-brand-purple"
                />
                <button type="submit" className="mt-2 rounded-full bg-brand-purple px-4 py-2 text-sm text-white">
                  Salvar avaliação
                </button>
              </form>
            </>
          ) : (
            <p className="text-brand-ink/50">Este aluno ainda não fez o teste de nivelamento.</p>
          )}
        </div>

        <div className="mt-6 rounded-xl2 border border-brand-ink/10 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-brand-ink/70">Atividades realizadas</p>
            <div className="ml-auto flex gap-1 text-xs">
              <a
                href={`/teacher/students/${params.id}`}
                className={`rounded-full px-3 py-1 ${!searchParams.skill ? "bg-brand-purple text-white" : "bg-brand-cream text-brand-ink/60"}`}
              >
                Todas
              </a>
              {SKILLS.map((skill) => (
                <a
                  key={skill}
                  href={`/teacher/students/${params.id}?skill=${skill}`}
                  className={`rounded-full px-3 py-1 ${searchParams.skill === skill ? "bg-brand-purple text-white" : "bg-brand-cream text-brand-ink/60"}`}
                >
                  {SKILL_LABEL[skill]}
                </a>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-brand-ink/10 text-sm">
            {filteredAttempts.map((a: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between py-2">
                <span>{a.activities?.title}</span>
                <span className="text-brand-ink/50">{Math.round(Number(a.score ?? 0))}%</span>
              </li>
            ))}
            {filteredAttempts.length === 0 && <p className="py-2 text-brand-ink/40">Nenhuma atividade encontrada.</p>}
          </ul>
        </div>
      </main>
    </div>
  );
}
