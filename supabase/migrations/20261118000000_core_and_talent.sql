-- =====================================================================
-- LEAD Core + Talent: módulo 1 (registro de estudiantes y resume)
--
-- core   = personas y roles compartidos por todas las plataformas LEAD
-- talent = datos que solo usa LEAD Talent
--
-- Regla: si Aspire (u otra plataforma) también lo necesitaría, va en core.
--
-- Acceso: ningún schema se expone por la Data API de Supabase.
-- El backend FastAPI es la única puerta de entrada. RLS queda activado
-- y sin políticas para anon/authenticated, así que todo se niega por defecto.
-- =====================================================================

create extension if not exists pgcrypto;

create schema if not exists core;
create schema if not exists talent;

revoke all on schema core from anon, authenticated, public;
revoke all on schema talent from anon, authenticated, public;

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------
create or replace function core.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- core.app: plataformas LEAD. Hoy solo talent.
-- Para sumar Aspire: alter type core.app add value 'aspire';
-- ---------------------------------------------------------------------
create type core.app as enum ('talent');

-- ---------------------------------------------------------------------
-- core.university: catálogo compartido
-- ---------------------------------------------------------------------
create table core.university (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) > 0),
  country_code  char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  created_at    timestamptz not null default now(),
  unique (name, country_code)
);

-- ---------------------------------------------------------------------
-- core.person: la persona, exista o no su cuenta.
-- auth_user_id es opcional para poder importar participantes de Aspire
-- antes de que creen su cuenta.
-- ---------------------------------------------------------------------
create table core.person (
  id                uuid primary key default gen_random_uuid(),
  auth_user_id      uuid unique references auth.users (id) on delete set null,
  email             text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  full_name         text check (full_name is null or length(trim(full_name)) > 0),
  phone             text,
  city              text,
  country_code      char(2) check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  university_id     uuid references core.university (id) on delete set null,
  university_other  text,
  major             text,
  graduation_year   smallint check (graduation_year between 1990 and 2045),
  linkedin_url      text check (linkedin_url is null or linkedin_url ~* '^https://([a-z]{2,3}\.)?linkedin\.com/'),
  avatar_path       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index person_email_lower_key on core.person (lower(email));

create trigger person_set_updated_at
  before update on core.person
  for each row execute function core.set_updated_at();

-- ---------------------------------------------------------------------
-- core.person_app_role: qué es cada persona en cada plataforma.
-- Una persona puede ser 'student' en talent y 'participant' en aspire.
-- ---------------------------------------------------------------------
create table core.person_app_role (
  person_id   uuid not null references core.person (id) on delete cascade,
  app         core.app not null,
  role        text not null check (role ~ '^[a-z_]+$'),
  created_at  timestamptz not null default now(),
  primary key (person_id, app, role)
);

-- ---------------------------------------------------------------------
-- Enlace cuenta → persona.
-- Solo enlaza cuando el email está confirmado. Si enlazara al crear la
-- cuenta, alguien podría registrarse con el email de otra persona
-- importada y quedarse con su historial antes de confirmar.
-- ---------------------------------------------------------------------
create or replace function core.link_auth_user_to_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person_id uuid;
begin
  if new.email is null or new.email_confirmed_at is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.email_confirmed_at is not null
     and old.email is not distinct from new.email then
    return new;
  end if;

  -- 1. Ya enlazada: nada que hacer.
  select id into v_person_id from core.person where auth_user_id = new.id;
  if v_person_id is not null then
    return new;
  end if;

  -- 2. Persona importada sin cuenta con el mismo email: enlazar.
  update core.person
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and auth_user_id is null
  returning id into v_person_id;

  -- 3. Persona nueva.
  if v_person_id is null then
    insert into core.person (auth_user_id, email, full_name)
    values (
      new.id,
      new.email,
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name',
                           new.raw_user_meta_data ->> 'name')), '')
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at, email on auth.users
  for each row execute function core.link_auth_user_to_person();

-- ---------------------------------------------------------------------
-- Custom Access Token Hook: mete los roles por plataforma en el JWT.
-- Resultado en el token: "app_roles": {"talent": ["student"]}
-- Activar en Supabase: Authentication > Hooks > Custom Access Token
-- → core.custom_access_token_hook
-- ---------------------------------------------------------------------
create or replace function core.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_roles  jsonb;
  v_claims jsonb;
begin
  select coalesce(jsonb_object_agg(s.app, s.roles), '{}'::jsonb)
    into v_roles
    from (
      select par.app::text as app, jsonb_agg(par.role order by par.role) as roles
        from core.person_app_role par
        join core.person p on p.id = par.person_id
       where p.auth_user_id = (event ->> 'user_id')::uuid
       group by par.app
    ) s;

  v_claims := coalesce(event -> 'claims', '{}'::jsonb);
  v_claims := jsonb_set(v_claims, '{app_roles}', v_roles);
  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant usage on schema core to supabase_auth_admin;
grant execute on function core.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function core.custom_access_token_hook(jsonb) from anon, authenticated, public;

-- ---------------------------------------------------------------------
-- talent.profile: datos de la persona que solo usa Talent
-- ---------------------------------------------------------------------
create table talent.profile (
  person_id                      uuid primary key references core.person (id) on delete cascade,
  headline                       text,
  english_level                  text check (english_level in ('basico', 'intermedio', 'avanzado', 'nativo')),
  skills                         text[] not null default '{}' check (cardinality(skills) <= 30),
  top_skills                     text[] not null default '{}' check (cardinality(top_skills) <= 3),
  target_roles                   text[] not null default '{}' check (cardinality(target_roles) <= 5),
  availability                   text check (availability in ('practicas', 'part', 'full')),
  recruiter_visible              boolean not null default false,
  recruiter_visible_consented_at timestamptz,
  onboarding_completed_at        timestamptz,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  -- Visible para recruiters solo con consentimiento registrado.
  constraint recruiter_visible_requires_consent
    check (not recruiter_visible or recruiter_visible_consented_at is not null)
);

create trigger profile_set_updated_at
  before update on talent.profile
  for each row execute function core.set_updated_at();

-- ---------------------------------------------------------------------
-- talent.resume: historial de resumes, uno solo vigente por persona
-- ---------------------------------------------------------------------
create table talent.resume (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references core.person (id) on delete cascade,
  storage_path  text not null unique,
  file_name     text not null,
  mime_type     text not null check (mime_type in (
                  'application/pdf',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes    integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  is_current    boolean not null default true,
  uploaded_at   timestamptz not null default now(),
  -- La ruta siempre empieza con el id de la persona: {person_id}/{archivo}
  constraint resume_path_belongs_to_person
    check (storage_path like person_id::text || '/%')
);

create unique index resume_one_current_per_person
  on talent.resume (person_id) where is_current;

-- ---------------------------------------------------------------------
-- Storage: bucket privado para resumes (máx. 10 MB, PDF/DOC/DOCX)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes', 'resumes', false, 10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- RLS: activado y sin políticas = nadie entra por la Data API.
-- ---------------------------------------------------------------------
alter table core.university       enable row level security;
alter table core.person           enable row level security;
alter table core.person_app_role  enable row level security;
alter table talent.profile        enable row level security;
alter table talent.resume         enable row level security;
