# Hey Teacher! — App (Next.js + Supabase + Vercel)

MVP funcional da plataforma descrita no documento-mestre: área do aluno (dashboard de CEFR
e desempenho por habilidade, atividades com correção automática e até 3 tentativas, perfil
com interesses/objetivos) e área da professora (lista de alunos, detalhe com filtros e notas
privadas, atualização de nível CEFR, calendário de aulas com status).

O que **não** está incluído neste MVP (para você evoluir depois): geração de áudio/TTS,
placement test automatizado completo, avaliação automática de Speaking, notificações push,
tela de vínculo aluno↔professora (hoje é feito direto no banco — veja Passo 5).

---

## Passo 1 — Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com), crie uma conta e clique em **New project**.
2. Escolha nome, senha do banco e região (ex.: `South America (São Paulo)`).
3. Aguarde o projeto ser provisionado (leva ~2 minutos).

## Passo 2 — Rodar o schema do banco

1. No painel do Supabase, vá em **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/schema.sql` deste pacote, copie todo o conteúdo e cole no editor.
3. Clique em **Run**. Isso cria todas as tabelas, tipos, políticas de segurança (RLS) e o
   gatilho que cria automaticamente um `profile` para cada novo usuário.
4. (Opcional, recomendado para testar) Rode também `supabase/seed_example.sql` para ter
   2 atividades de exemplo já cadastradas.

## Passo 3 — Pegar as chaves de API

1. No painel do Supabase, vá em **Project Settings** → **API**.
2. Copie:
   - **Project URL** → vai virar `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → vai virar `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → vai virar `SUPABASE_SERVICE_ROLE_KEY` (guarde em segredo, nunca exponha no frontend)

## Passo 4 — Configurar o projeto localmente (opcional, mas recomendado para testar antes de publicar)

```bash
# dentro da pasta do projeto
npm install
cp .env.local.example .env.local
# edite .env.local e cole as 3 chaves do Passo 3
npm run dev
```

Acesse `http://localhost:3000`, clique em **Entrar** → **Criar conta**, escolha "Sou
professora" para o seu primeiro usuário (assim você já cai no painel da professora).

## Passo 5 — Vincular um aluno a uma professora

O MVP não tem tela de convite ainda, então esse vínculo é feito direto no Supabase:

1. Crie uma conta de aluno pelo app normalmente (marque "Sou aluno(a)" na tela de cadastro).
2. No painel do Supabase, vá em **Authentication → Users** e copie o `UID` da professora e
   do aluno.
3. Vá em **Table Editor → teacher_students** → **Insert row** e preencha `teacher_id` e
   `student_id` com esses UIDs.
4. Pronto — a aluna já aparece no painel da professora.

## Passo 6 — Publicar no Vercel

1. Suba este projeto para um repositório no GitHub (ou GitLab/Bitbucket):
   ```bash
   git init
   git add .
   git commit -m "Hey Teacher! app inicial"
   git branch -M main
   git remote add origin SEU_REPOSITORIO_GIT
   git push -u origin main
   ```
2. Acesse [vercel.com](https://vercel.com), clique em **Add New → Project** e importe esse
   repositório.
3. Na tela de configuração, abra **Environment Variables** e adicione as mesmas 3 variáveis
   do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Clique em **Deploy**. Em ~1 minuto o app estará no ar em um domínio `.vercel.app`.

## Passo 7 — Autorizar o domínio do Vercel no Supabase (importante)

1. No Supabase, vá em **Authentication → URL Configuration**.
2. Em **Site URL**, coloque a URL do seu app no Vercel (ex.: `https://hey-teacher.vercel.app`).
3. Em **Redirect URLs**, adicione a mesma URL (e `http://localhost:3000` se for testar local).
4. Salve. Sem isso, o login/cadastro pode falhar em produção.

---

## Estrutura do projeto

```
app/
  page.tsx                    → landing page
  login/page.tsx               → login + cadastro (com escolha de papel aluno/professora)
  student/
    dashboard/page.tsx         → CEFR, % por habilidade, atividades feitas/pendentes
    profile/page.tsx           → nome, interesses, objetivos
    activities/page.tsx        → lista de atividades do nível do aluno
    activities/[id]/page.tsx   → atividade com correção automática (até 3 tentativas)
  teacher/
    dashboard/page.tsx         → lista de alunos vinculados com % geral
    students/[id]/page.tsx     → detalhe do aluno: filtros por habilidade, notas privadas, CEFR
    calendar/page.tsx          → agendar aulas e marcar status (presente/faltou/remarcada/cancelada)
lib/supabase/                  → clientes Supabase (browser, servidor, middleware)
middleware.ts                  → protege rotas e separa aluno/professora
supabase/schema.sql            → banco de dados completo com RLS
supabase/seed_example.sql      → dados de exemplo opcionais
```

## Próximos passos sugeridos (não incluídos neste MVP)

- Tela de convite/vínculo aluno↔professora (hoje manual via Supabase, Passo 5).
- Placement test guiado (Reading/Writing/Listening) na primeira vez que o aluno entra.
- Upload e reprodução de áudio dos diálogos (usar o **Supabase Storage**, criando um bucket
  `audio` e salvando a URL em `activities.content`).
- Avaliação automática de Speaking (ex.: integrar uma API de reconhecimento de fala).
- Sistema de notificações (a tabela `notifications` já existe no schema, falta a UI).
- Onboarding completo (contato prévio com inglês, tempo de estudo) — a coluna já existe em
  `profiles`, falta o formulário.

Todo o banco já está desenhado para suportar essas evoluções sem quebrar o que existe.
