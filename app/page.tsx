import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <span className="font-display text-2xl text-brand-purple">Hey Teacher!</span>
        <Link
          href="/login"
          className="rounded-full border border-brand-purple px-5 py-2 text-sm font-medium text-brand-purple transition hover:bg-brand-purple hover:text-white"
        >
          Entrar
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center md:px-12">
        <p className="mb-4 text-sm uppercase tracking-widest text-brand-lilacDark">Prática · Acompanhamento · Evolução</p>
        <h1 className="max-w-2xl font-display text-4xl leading-tight text-brand-ink md:text-6xl">
          Eu consigo aprender inglês.
        </h1>
        <p className="mt-6 max-w-lg text-lg text-brand-ink/70">
          A plataforma que acompanha sua prática de Speaking, Listening, Reading e Writing —
          e mostra sua evolução real, aula após aula.
        </p>
        <Link
          href="/login"
          className="mt-10 rounded-full bg-brand-purple px-8 py-3 text-white transition hover:bg-brand-lilacDark"
        >
          Acessar minha conta
        </Link>
      </section>

      <footer className="px-6 py-6 text-center text-xs text-brand-ink/40 md:px-12">
        Hey Teacher! — Sistema integrado de ensino de inglês.
      </footer>
    </main>
  );
}
