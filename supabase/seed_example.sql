-- ============================================================
-- DADOS DE EXEMPLO (opcional) — rode depois do schema.sql
-- Só para você ver o app funcionando com conteúdo real.
-- Depois você (ou a professora) cadastra as atividades reais.
-- ============================================================

insert into activities (title, skill, level, book, unit_number, lesson_number, instructions, content, correct_answers)
values (
  'Greetings — Multiple Choice',
  'reading',
  'A1',
  'START',
  1,
  1,
  'Choose the correct answer for each question.',
  '{
    "questions": [
      { "id": "q1", "type": "multiple_choice", "prompt": "How do you say ''Bom dia'' in English?", "options": ["Good morning", "Good night", "Good bye"] },
      { "id": "q2", "type": "multiple_choice", "prompt": "Complete: ''Nice to ___ you.''", "options": ["meet", "meat", "meets"] }
    ]
  }'::jsonb,
  '{ "q1": "Good morning", "q2": "meet" }'::jsonb
);

insert into activities (title, skill, level, book, unit_number, lesson_number, instructions, content, correct_answers)
values (
  'Daily Routine — Fill in the blank',
  'writing',
  'A1',
  'START',
  1,
  2,
  'Type the missing word.',
  '{
    "questions": [
      { "id": "q1", "type": "text", "prompt": "I ___ up at 7 a.m. every day. (wake)" }
    ]
  }'::jsonb,
  '{ "q1": "wake" }'::jsonb
);

-- Para vincular um aluno a uma professora manualmente (troque os UUIDs pelos reais,
-- encontrados em Authentication > Users no painel do Supabase):
-- insert into teacher_students (teacher_id, student_id) values ('UUID_DA_PROFESSORA', 'UUID_DO_ALUNO');
