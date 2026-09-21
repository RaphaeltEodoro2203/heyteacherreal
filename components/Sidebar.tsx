import Link from "next/link";

export function Sidebar({
  role,
  active
}: {
  role: "student" | "teacher";
  active: string;
}) {
  const studentLinks = [
    { href: "/student/dashboard", label: "Painel" },
    { href: "/student/activities", label: "Atividades" },
    { href: "/student/profile", label: "Perfil" }
  ];
  const teacherLinks = [
    { href: "/teacher/dashboard", label: "Alunos" },
    { href: "/teacher/calendar", label: "Calendário" }
  ];
  const links = role === "student" ? studentLinks : teacherLinks;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-brand-ink/10 bg-white px-4 py-6">
      <span className="mb-8 px-2 font-display text-lg text-brand-purple">Hey Teacher!</span>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              active === link.href
                ? "bg-brand-lilac/20 font-medium text-brand-purple"
                : "text-brand-ink/60 hover:bg-brand-cream"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <form action="/api/auth/signout" method="post" className="mt-auto">
        <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-brand-ink/50 hover:bg-brand-cream">
          Sair
        </button>
      </form>
    </aside>
  );
}
