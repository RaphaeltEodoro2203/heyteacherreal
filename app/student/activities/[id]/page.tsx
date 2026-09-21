import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { revalidatePath } from "next/cache";

type Question = { id: string; prompt: string; options?: string[]; type: "multiple_choice" | "text" };

export default async function ActivityPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: activity } = await supabase.from("activities").select("*").eq("id", params.id).single();
  if (!activity) notFound();

  const { data: attempts } = await supabase
    .from("activity_attempts")
    .select("*")
    .eq("student_id", user.id)
    .eq("activity_id", params.id)
    .order("attempt_number", { ascending: false });

  const attemptCount = attempts?.length ?? 0;
  const latest = attempts?.[0];
  const canSubmit = attemptCount < (activity.max_attempts ?? 3);
  const questions: Question[] = activity.content?.questions ?? [];

  async function submitAttempt(formData: FormData) {
    "use server";
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: activity } = await supabase.from("activities").select("*").eq("id", params.id).single();
    if (!activity) return;

    const { count } = await supabase
      .from("activity_attempts")
      .select("*", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("activity_id", params.id);

    if ((count ?? 0) >= (activity.max_attempts ?? 3)) return;

    const questions: Question[] = activity.content?.questions ?? [];
    const correctMap: Record<string, string> = activity.correct_answers ?? {};
    const answers: Record<string, string> = {};
    const errors: { question_id: string; your_answer: string; correct_answer: string }[] = [];
    let correctCount = 0;

    for (const q of questions) {
      const answer = String(formData.get(q.id) ?? "").trim();
      answers[q.id] = answer;
      const correct = (correctMap[q.id] ?? "").trim();
      const isCorrect = answer.toLowerCase() === correct.toLowerCase();
      if (isCorrect) correctCount += 1;
      else errors.push({ question_id: q.id, your_answer: answer, correct_answer: correct });
    }

    const score = questions.length ? (correctCount / questions.length) * 100 : 0;

    await supabase.from("activity_attempts").insert({
      student_id: user.id,
      activity_id: params.id,
      attempt_number: (count ?? 0) + 1,
      answers,
      score,
      errors
    });

    revalidatePath(`/student/activities/${params.id}`);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="student" active="/student/activities" />
      <main className="flex-1 px-8 py-8 md:px-12">
        <p className="text-xs uppercase tracking-wide text-brand-lilacDark">
          {activity.skill} · {activity.level}
        </p>
        <h1 className="mt-1 font-display text-3xl text-brand-ink">{activity.title}</h1>
        {activity.instructions && <p className="mt-2 text-brand-ink/60">{activity.instructions}</p>}

        {latest && (
          <div className="mt-6 rounded-xl2 border border-brand-ink/10 bg-white p-5">
            <p className="text-sm font-medium text-brand-ink/70">
              Última tentativa ({attemptCount}/{activity.max_attempts}) · Score: {Math.round(Number(latest.score ?? 0))}%
            </p>
            {Array.isArray(latest.errors) && latest.errors.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-brand-ink/60">
                {latest.errors.map((err: any) => (
                  <li key={err.question_id}>
                    <span className="text-brand-red">Sua resposta:</span> {err.your_answer || "(em branco)"} ·{" "}
                    <span className="text-brand-mint">Correto:</span> {err.correct_answer}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {canSubmit ? (
          <form action={submitAttempt} className="mt-8 max-w-2xl space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-xl2 border border-brand-ink/10 bg-white p-5">
                <p className="font-medium text-brand-ink">
                  {idx + 1}. {q.prompt}
                </p>
                {q.type === "multiple_choice" && q.options ? (
                  <div className="mt-3 space-y-2">
                    {q.options.map((opt) => (
                      <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="radio" name={q.id} value={opt} required className="accent-brand-purple" />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    name={q.id}
                    required
                    className="mt-3 w-full rounded-lg border border-brand-ink/15 px-3 py-2 outline-none focus:border-brand-purple"
                  />
                )}
              </div>
            ))}
            {questions.length === 0 && (
              <p className="text-brand-ink/50">Esta atividade ainda não tem perguntas cadastradas.</p>
            )}
            {questions.length > 0 && (
              <button
                type="submit"
                className="rounded-full bg-brand-purple px-8 py-3 text-white transition hover:bg-brand-lilacDark"
              >
                Enviar respostas ({attemptCount + 1}ª tentativa)
              </button>
            )}
          </form>
        ) : (
          <p className="mt-8 text-brand-ink/60">Você já usou suas 3 tentativas nesta atividade.</p>
        )}
      </main>
    </div>
  );
}
