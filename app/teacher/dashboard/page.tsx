import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { revalidatePath } from "next/cache";

async function approveStudent(formData: FormData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return;
  const studentId = String(formData.get("student_id"));

  await supabase.from("profiles").update({ status: "approved" }).eq("id", studentId);
  // Vincula o aluno a essa professora automaticamente ao aprovar
  await supabase.from("teacher_students").insert({ teacher_id: user.id, student_id: studentId });

  revalidatePath("/teacher/dashboard");
}

async function rejectStudent(formData: FormData) {
  "use server";
  const supabase = createClient();
  const studentId = String(formData.get("student_id"));
  await supabase.from("profiles").update({ status: "rejected" }).eq("id", studentId);
  revalidatePath("/teacher/dashboard");
}

export default async function TeacherDashboard() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pendingStudents } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("role", "student")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const { data: links } = await supabase.from("teacher_students").select("student_id").eq("teacher_id", user.id);
  const studentIds = (links ?? []).map((l) => l.student_id);

  const { data: students } = studentIds.length
    ? await supabase.from("profiles").select("*").in("id", studentIds)
    : { data: [] };

  const studentsWithScore = await Promise.all(
    (students ?? []).map(async (student) => {
      const { data: attempts } = await supabase
        .from("activity_attempts")
        .select("score")
        .eq("student_id", student.id)
        .eq("is_first_attempt", true);
      const scores = (attempts ?? []).map((a) => Number(a.score ?? 0));
      const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
      return { ...student, avgScore: avg };
    })
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar role="teacher" active="/teacher/dashboard" />
      <main className="flex-1 px-8 py-8 md:px-12">
        <h1 className="font-display text-3xl text-brand-ink">Seus alunos</h1>
        <p className="mt-1 text-brand-ink/60">{studentsWithScore.length} aluno(s) vinculado(s) a você.</p>

        {(pendingStudents ?? []).length > 0 && (
          <div className="mt-8 rounded-xl2 border border-brand-lilac/40 bg-brand-lilac/10 p-6">
            <p className="mb-4 text-sm font-medium text-brand-purple">
              Solicitações pendentes ({(pendingStudents ?? []).length})
            </p>
            <ul className="space-y-3">
              {(pendingStudents ?? []).map((student) => (
                <li
                  key={student.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3"
                >
                  <span className="font-medium text-brand-ink">{student.full_name || "Aluno sem nome"}</span>
                  <div className="flex gap-2">
                    <form action={approveStudent}>
                      <input type="hidden" name="student_id" value={student.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-brand-purple px-4 py-1.5 text-sm text-white transition hover:bg-brand-lilacDark"
                      >
                        Aprovar
                      </button>
                    </form>
                    <form action={rejectStudent}>
                      <input type="hidden" name="student_id" value={student.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-brand-red/40 px-4 py-1.5 text-sm text-brand-red transition hover:bg-brand-red/10"
                      >
                        Recusar
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {studentsWithScore.map((student) => (
            <Link
              key={student.id}
              href={`/teacher/students/${student.id}`}
              className="rounded-xl2 border border-brand-ink/10 bg-white p-5 transition hover:border-brand-purple"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-brand-ink">{student.full_name || "Aluno sem nome"}</p>
                <span className="rounded-full bg-brand-lilac/20 px-3 py-1 text-xs font-medium text-brand-purple">
                  {student.cefr_level}
                </span>
              </div>
              <p className="mt-3 text-sm text-brand-ink/50">Desempenho geral: {Math.round(student.avgScore)}%</p>
            </Link>
          ))}
          {studentsWithScore.length === 0 && (
            <p className="text-brand-ink/50">
              Nenhum aluno vinculado ainda. Vincule um aluno inserindo uma linha em{" "}
              <code className="rounded bg-brand-cream px-1">teacher_students</code> no Supabase, ou construa uma tela
              de convite/vínculo.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
