-- =====================================================================
-- Registro de 6 pasos: "¿Cuál te describe mejor?" y eventos del embudo
-- =====================================================================

-- ---------------------------------------------------------------------
-- talent.profile.career_stage: respuesta del paso 1 del registro
-- ---------------------------------------------------------------------
alter table talent.profile
  add column career_stage text
    check (career_stage in (
      'estudiante_universitario',
      'recien_graduado',
      'posgrado',
      'profesional_joven'
    ));

comment on column talent.profile.career_stage is
  'Paso 1 del registro: ¿Cuál te describe mejor?';

-- ---------------------------------------------------------------------
-- talent.registration_event: embudo del registro
--
-- Sin datos personales: no guarda person_id, email ni nada que escriba
-- el estudiante. session_id es un uuid aleatorio que el navegador crea
-- por cada intento de registro, solo para unir los pasos de ese intento.
-- ---------------------------------------------------------------------
create table talent.registration_event (
  id               bigint generated always as identity primary key,
  session_id       uuid not null,
  name             text not null check (name in (
                     'registro_paso_visto',
                     'registro_paso_completado',
                     'cv_subido',
                     'registro_sin_cv',
                     'cv_lectura_fallida',
                     'registro_terminado'
                   )),
  step             smallint not null check (step between 1 and 6),
  device           text not null check (device in ('mobile', 'tablet', 'desktop')),
  seconds_on_step  integer check (seconds_on_step between 0 and 86400),
  -- Motivo técnico de cv_lectura_fallida (por ejemplo "timeout"). Nunca texto libre.
  reason           text check (reason ~ '^[a-z_]{1,40}$'),
  created_at       timestamptz not null default now(),
  constraint registration_event_reason_only_on_failure
    check (reason is null or name = 'cv_lectura_fallida')
);

create index registration_event_created_at_idx on talent.registration_event (created_at);
create index registration_event_name_step_idx on talent.registration_event (name, step);

-- RLS activado y sin políticas: solo entra FastAPI.
alter table talent.registration_event enable row level security;
