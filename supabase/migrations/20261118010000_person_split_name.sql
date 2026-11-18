-- =====================================================================
-- core.person: nombre separado en nombres y apellidos.
--
-- given_names  = "Nombres"   (obligatorio en el registro, plural: "María José")
-- family_names = "Apellidos" (opcional, plural: "García López"; hay personas con un solo nombre)
-- full_name    = calculado automáticamente, solo lectura. Para mostrar y buscar.
-- =====================================================================

alter table core.person
  add column given_names text check (given_names is null or length(trim(given_names)) > 0),
  add column family_names text check (family_names is null or length(trim(family_names)) > 0);

-- Datos de prueba existentes: el nombre completo pasa a "nombres".
update core.person set given_names = full_name where full_name is not null;

alter table core.person drop column full_name;

alter table core.person
  add column full_name text generated always as (
    nullif(trim(coalesce(given_names, '') || ' ' || coalesce(family_names, '')), '')
  ) stored;

-- El trigger de enlace ahora guarda nombres y apellidos por separado.
-- Google entrega given_name y family_name. Otros proveedores solo full_name o name.
create or replace function core.link_auth_user_to_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person_id uuid;
  v_given     text;
  v_family    text;
begin
  if new.email is null or new.email_confirmed_at is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.email_confirmed_at is not null
     and old.email is not distinct from new.email then
    return new;
  end if;

  select id into v_person_id from core.person where auth_user_id = new.id;
  if v_person_id is not null then
    return new;
  end if;

  update core.person
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and auth_user_id is null
  returning id into v_person_id;

  if v_person_id is null then
    v_given  := nullif(trim(new.raw_user_meta_data ->> 'given_name'), '');
    v_family := nullif(trim(new.raw_user_meta_data ->> 'family_name'), '');
    if v_given is null then
      v_given := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name',
                                      new.raw_user_meta_data ->> 'name')), '');
      v_family := null;
    end if;

    insert into core.person (auth_user_id, email, given_names, family_names)
    values (new.id, new.email, v_given, v_family)
    on conflict do nothing;
  end if;

  return new;
end;
$$;
