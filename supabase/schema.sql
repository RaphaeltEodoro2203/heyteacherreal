-- ============================================================
-- HEY TEACHER! — SCHEMA COMPLETO DO BANCO DE DADOS (Supabase)
-- Cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- ============================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";

-- ---------- TIPOS (ENUMS) ----------
create type user_role as enum ('student', 'teacher');
create type cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1');
create type skill_type as enum ('speaking', 'listening', 'reading', 'writing');
create type session_status as enum ('present', 'absent', 'rescheduled', 'cancelled', 'scheduled');
create type interest_type as enum (
  'movies','books','series','music','singers','travel','work','sport','games','fashion','cooking','other'
);
create type goal_type as enum ('work','travel','studies','conversation','personal_life','other');

-- ---------- PROFILES ----------
-- Um perfil por usuário autenticado (aluno ou professora). id = auth.users.id
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null default '',
  photo_url text,
  cefr_level cefr_level default 'A1',
  cefr_reason text, -- justificativa do nível, baseada em desempenho
  prior_english_contact boolean,
  study_duration_months int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- INTERESSES DO ALUNO ----------
create table student_interests (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references profiles(id) on delete cascade,
  interest interest_type not null,
  other_text text,
  created_at timestamptz not null default now(),
  unique (student_id, interest)
);

-- ---------- OBJETIVOS / MOTIVAÇÕES DO ALUNO ----------
create table student_goals (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references profiles(id) on delete cascade,
  goal goal_type not null,
  other_text text,
  created_at timestamptz not null default now(),
  unique (student_id, goal)
);

-- ---------- VÍNCULO ALUNO <-> PROFESSORA ----------
-- Permite múltiplas professoras/alunos no futuro sem quebrar o schema
create table teacher_students (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, student_id)
);

-- ---------- PLACEMENT TEST ----------
create table placement_tests (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references profiles(id) on delete cascade,
  reading_score numeric(5,2),
  writing_score numeric(5,2),
  listening_score numeric(5,2),
  speaking_notes text, -- avaliado pela professora
  level_assigned cefr_level,
  assigned_by uuid references profiles(id), -- professora que definiu/ajustou o nível
  created_at timestamptz not null default now()
);

-- ---------- ATIVIDADES (banco de exercícios) ----------
create table activities (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  skill skill_type not null,
  level cefr_level not null,
  book text, -- START, CONNECT, EXPLORE, EXPAND, FLUENT, TRAVEL, WORK, JUMP, ROCKET
  unit_number int,
  lesson_number int,
  instructions text,
  content jsonb not null default '{}'::jsonb,       -- perguntas, opções, textos, áudio urls
  correct_answers jsonb not null default '{}'::jsonb, -- gabarito para correção automática
  max_attempts int not null default 3,
  created_at timestamptz not null default now()
);

-- ---------- TENTATIVAS DE ATIVIDADE ----------
create table activity_attempts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references profiles(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  attempt_number int not null default 1,
  answers jsonb not null default '{}'::jsonb,
  score numeric(5,2), -- percentual 0-100
  errors jsonb default '[]'::jsonb,
  is_first_attempt boolean generated always as (attempt_number = 1) stored,
  submitted_at timestamptz not null default now(),
  check (attempt_number between 1 and 3)
);

-- ---------- SESSÕES / CALENDÁRIO ----------
create table class_sessions (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  scheduled_at timestamptz not null,
  status session_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- NOTAS PRIVADAS DA PROFESSORA ----------
create table teacher_notes (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

-- ---------- NOTIFICAÇÕES ----------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRIGGER: cria automaticamente um profile quando um usuário se cadastra
-- (o role vem de raw_user_meta_data definido no signup)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table student_interests enable row level security;
alter table student_goals enable row level security;
alter table teacher_students enable row level security;
alter table placement_tests enable row level security;
alter table activities enable row level security;
alter table activity_attempts enable row level security;
alter table class_sessions enable row level security;
alter table teacher_notes enable row level security;
alter table notifications enable row level security;

-- Helper: verifica se o usuário atual é professora do aluno em questão
create or replace function public.is_teacher_of(student uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from teacher_students ts
    where ts.student_id = student and ts.teacher_id = auth.uid()
  );
$$;

create or replace function public.current_role()
returns user_role
language sql
security definer set search_path = public
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- ---------- PROFILES ----------
create policy "profiles: aluno vê e edita o próprio perfil"
  on profiles for select using (id = auth.uid());
create policy "profiles: professora vê perfis dos seus alunos"
  on profiles for select using (public.is_teacher_of(id) or id = auth.uid());
create policy "profiles: usuário edita o próprio perfil"
  on profiles for update using (id = auth.uid());

-- ---------- STUDENT_INTERESTS / STUDENT_GOALS ----------
create policy "interests: dono ou professora"
  on student_interests for select using (student_id = auth.uid() or public.is_teacher_of(student_id));
create policy "interests: aluno gerencia os próprios"
  on student_interests for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "goals: dono ou professora"
  on student_goals for select using (student_id = auth.uid() or public.is_teacher_of(student_id));
create policy "goals: aluno gerencia os próprios"
  on student_goals for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- ---------- TEACHER_STUDENTS ----------
create policy "vínculo: professora ou aluno envolvido vê"
  on teacher_students for select using (teacher_id = auth.uid() or student_id = auth.uid());
create policy "vínculo: só professora cria"
  on teacher_students for insert with check (teacher_id = auth.uid() and public.current_role() = 'teacher');

-- ---------- PLACEMENT_TESTS ----------
create policy "placement: aluno ou professora vê"
  on placement_tests for select using (student_id = auth.uid() or public.is_teacher_of(student_id));
create policy "placement: professora cria/edita"
  on placement_tests for insert with check (public.is_teacher_of(student_id));
create policy "placement: professora atualiza"
  on placement_tests for update using (public.is_teacher_of(student_id));

-- ---------- ACTIVITIES (conteúdo, leitura liberada a todo usuário autenticado) ----------
create policy "activities: qualquer usuário autenticado lê"
  on activities for select using (auth.uid() is not null);
create policy "activities: só professora cria/edita"
  on activities for insert with check (public.current_role() = 'teacher');
create policy "activities: só professora atualiza"
  on activities for update using (public.current_role() = 'teacher');

-- ---------- ACTIVITY_ATTEMPTS ----------
create policy "attempts: aluno vê as próprias, professora vê dos seus alunos"
  on activity_attempts for select using (student_id = auth.uid() or public.is_teacher_of(student_id));
create policy "attempts: aluno cria as próprias (até 3, checado na aplicação)"
  on activity_attempts for insert with check (student_id = auth.uid());

-- ---------- CLASS_SESSIONS ----------
create policy "sessions: aluno ou professora envolvidos veem"
  on class_sessions for select using (student_id = auth.uid() or teacher_id = auth.uid());
create policy "sessions: professora cria"
  on class_sessions for insert with check (teacher_id = auth.uid() and public.current_role() = 'teacher');
create policy "sessions: professora atualiza"
  on class_sessions for update using (teacher_id = auth.uid());

-- ---------- TEACHER_NOTES (nunca visível ao aluno) ----------
create policy "notes: só a professora autora vê"
  on teacher_notes for select using (teacher_id = auth.uid());
create policy "notes: só professora cria"
  on teacher_notes for insert with check (teacher_id = auth.uid() and public.current_role() = 'teacher');

-- ---------- NOTIFICATIONS ----------
create policy "notifications: dono vê e marca como lida"
  on notifications for select using (profile_id = auth.uid());
create policy "notifications: dono atualiza (marcar como lida)"
  on notifications for update using (profile_id = auth.uid());
create policy "notifications: sistema/professora pode inserir para seus alunos"
  on notifications for insert with check (
    profile_id = auth.uid() or public.is_teacher_of(profile_id)
  );

-- ============================================================
-- ÍNDICES ÚTEIS
-- ============================================================
create index idx_attempts_student on activity_attempts(student_id);
create index idx_attempts_activity on activity_attempts(activity_id);
create index idx_sessions_student on class_sessions(student_id);
create index idx_sessions_teacher on class_sessions(teacher_id);
create index idx_notes_student on teacher_notes(student_id);
create index idx_activities_skill_level on activities(skill, level);

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
