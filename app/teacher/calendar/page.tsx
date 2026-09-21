import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { revalidatePath } from "next/cache";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada", present: "Presente", absent: "Faltou", rescheduled: "Remarcada", cancelled: "Cancelada"
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-brand-sky/40 text-brand-ink",
  present: "bg-brand-mint/50 text-brand-ink",
  absent: "bg-brand-red/20 text-brand-red",
  rescheduled: "bg-brand-lilac/30 text-brand-purple",
  cancelled: "bg-brand-ink/10 text-brand-ink/50"
};

export default async function TeacherCalendarPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: links } = await supabase.from("teacher_students").select("student_id").eq("teacher_id", user.id);
  const studentIds = (links ?? []).map((l) => l.student_id);
  const { data: students } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [] };

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("*, profiles!class_sessions_student_id_fkey(full_name)")
    .eq("teacher_id", user.id)
    .order("scheduled_at", { ascending: true });

  async function createSession(formData: FormData) {
    "use server";
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const studentId = String(formData.get("student_id"));
    const scheduledAt = String(formData.get("scheduled_at"));
    if (!studentId || !scheduledAt) return;
    await supabase.from("class_sessions").insert({
      teacher_id: user.id,
      student_id: studentId,
      scheduled_at: new Date(scheduledAt).toISOString(),
      status: "scheduled"
    });
    revalidatePath("/teacher/calendar");
  }

  async function updateStatus(formData: FormData) {
    "use server";
    const supabase = createClient();
    const sessionId = String(formData.get("session_id"));
    const status = String(formData.get("status"));
    await supabase.from("class_sessions").update({ status, updated_at: new Date().toISOString() }).eq("id", sessionId);
    revalidatePath("/teacher/calendar");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="teacher" active="/teacher/calendar" />
      <main className="flex-1 px-8 py-8 md:px-12">
        <h1 className="font-display text-3xl text-brand-ink">Calendário de aulas</h1>

        <form action={createSession} className="mt-8 flex flex-wrap items-end gap-3 rounded-xl2 border border-brand-ink/10 bg-white p-5">
          <div>
            <label className="text-sm text-brand-ink/70">Aluno</label>
            <select name="student_id" required className="mt-1 block rounded-lg border border-brand-ink/15 px-3 py-2 text-sm">
              {(students ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-brand-ink/70">Data e hora</label>
            <input
              type="datetime-local"
              name="scheduled_at"
              required
              className="mt-1 block rounded-lg border border-brand-ink/15 px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="rounded-full bg-brand-purple px-5 py-2 text-sm text-white">
            Agendar aula
          </button>
        </form>

        <ul className="mt-6 space-y-3">
          {(sessions ?? []).map((s: any) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl2 border border-brand-ink/10 bg-white p-4">
              <span className="font-medium text-brand-ink">{s.profiles?.full_name}</span>
              <span className="text-sm text-brand-ink/50">
                {new Date(s.scheduled_at).toLocaleString("pt-BR")}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[s.status]}`}>
                {STATUS_LABEL[s.status]}
              </span>
              <form action={updateStatus} className="ml-auto flex items-center gap-2">
                <input type="hidden" name="session_id" value={s.id} />
                <select name="status" defaultValue={s.status} className="rounded-lg border border-brand-ink/15 px-2 py-1 text-xs">
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button type="submit" className="rounded-full bg-brand-cream px-3 py-1 text-xs text-brand-ink/70">
                  Atualizar
                </button>
              </form>
            </li>
          ))}
          {(sessions ?? []).length === 0 && <p className="text-brand-ink/50">Nenhuma aula agendada ainda.</p>}
        </ul>
      </main>
    </div>
  );
}
