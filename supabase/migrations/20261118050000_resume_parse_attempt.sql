-- =====================================================================
-- Límite de lecturas de CV con IA: 5 por persona por hora
--
-- Solo guarda quién intentó y cuándo. Nunca el texto del CV ni la
-- respuesta del modelo. Se inserta ANTES de llamar a Azure y cuenta
-- todos los intentos, también los fallidos.
-- Limpieza pendiente (ver plan): borrar filas de más de 1 día.
-- =====================================================================
create table talent.resume_parse_attempt (
  id          bigint generated always as identity primary key,
  person_id   uuid not null references core.person (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index resume_parse_attempt_person_created_idx
  on talent.resume_parse_attempt (person_id, created_at);

-- RLS activado y sin políticas: solo entra FastAPI.
alter table talent.resume_parse_attempt enable row level security;
