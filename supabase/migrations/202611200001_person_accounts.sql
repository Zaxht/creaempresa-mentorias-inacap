begin;
alter table public.app_profiles add column must_change_password boolean not null default false;

-- Auth creates the account and linked profile in one transaction. Only trusted
-- app metadata identifies the admin request; user metadata never assigns roles.
create table public.person_accounts (
  id uuid primary key,
  email text not null unique,
  kind text not null check (kind in ('mentors','mentees')),
  details jsonb not null,
  actor uuid not null references public.app_profiles(id),
  user_id uuid unique references auth.users(id),
  sending_until timestamptz,
  last_attempt timestamptz,
  created_at timestamptz not null default now()
);
alter table public.person_accounts enable row level security;
revoke all on public.person_accounts from public,anon,authenticated;

create function public.prepare_person_account(request_id uuid, person_kind text, details jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare provision public.person_accounts; address text; n integer; original_id uuid:=request_id;
begin
  if public.app_role() is distinct from 'Administrador' then
    raise exception 'Solo administración puede crear cuentas' using errcode='42501';
  end if;
  if request_id is null or person_kind not in ('mentors','mentees') or jsonb_typeof(details) is distinct from 'object'
    or octet_length(details::text)>8192 then raise exception 'Datos de cuenta inválidos'; end if;
  address:=lower(trim(details->>'email'));
  select id into request_id from public.person_accounts where id=request_id
    or (email=address and kind=person_kind and user_id is null) order by created_at limit 1;
  if request_id is null then request_id:=original_id; end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(address,request_id::text),0));
  select * into provision from public.person_accounts where id=request_id for update;
  if found and provision.kind<>person_kind then raise exception 'La cuenta corresponde a otra ficha'; end if;
  if provision.user_id is not null then
    return jsonb_build_object('id',provision.id,'complete',true);
  else
    address:=lower(trim(details->>'email'));
    if address is null or length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or coalesce(length(trim(details->>'name')),0) not between 1 and 100
      or length(coalesce(details->>'phone',''))>30
      or length(coalesce(details->>'venture',''))>150
      or length(coalesce(details->>'expertise',''))>150
      or exists(select 1 from jsonb_object_keys(details) k where k not in ('name','email','phone','venture','expertise'))
    then raise exception 'Revisa el nombre, correo y datos de la persona'; end if;
    if exists(select 1 from auth.users where lower(email)=address) then
      raise exception 'Este correo ya tiene una cuenta. No se creó otra ficha';
    end if;
    if exists(select 1 from public.mentors where lower(email)=address)
      or exists(select 1 from public.mentees where lower(email)=address) then
      raise exception 'Este correo ya está registrado en una ficha';
    end if;
    if exists(select 1 from public.person_accounts where email=address and id<>request_id) then
      raise exception 'Ya existe una cuenta para este correo. Reintenta desde la solicitud original';
    end if;
  end if;
  if provision.sending_until>clock_timestamp() then
    raise exception 'La cuenta se está procesando. Espera un minuto antes de reintentar';
  end if;
  insert into public.write_limits values(auth.uid(),clock_timestamp(),1) on conflict(actor) do update
    set since=case when public.write_limits.since<clock_timestamp()-interval '1 minute' then clock_timestamp() else public.write_limits.since end,
    count=case when public.write_limits.since<clock_timestamp()-interval '1 minute' then 1 else public.write_limits.count+1 end returning count into n;
  if n>20 then raise exception 'Demasiadas solicitudes. Espera un minuto'; end if;
  insert into public.person_accounts(id,email,kind,details,actor,sending_until,last_attempt)
    values(request_id,address,person_kind,details,auth.uid(),clock_timestamp()+interval '1 minute',clock_timestamp())
    on conflict(id) do update set email=excluded.email,actor=excluded.actor,
      details=case when public.person_accounts.user_id is null then excluded.details else public.person_accounts.details end,
      sending_until=excluded.sending_until,last_attempt=excluded.last_attempt;
  return jsonb_build_object('id',request_id,'email',address,'complete',false);
end $$;

create function public.link_program_person() returns trigger language plpgsql security definer set search_path='' as $$
declare provision public.person_accounts; specialties text[];
begin
  if new.raw_app_meta_data->>'program_request' is null then return new; end if;
  if exists(select 1 from public.person_accounts where id::text=new.raw_app_meta_data->>'program_request' and user_id=new.id) then return new; end if;
  select * into provision from public.person_accounts
    where id::text=new.raw_app_meta_data->>'program_request' and email=lower(new.email) and user_id is null and sending_until>clock_timestamp() for update;
  if not found then raise exception 'Solicitud de cuenta no disponible'; end if;
  if not exists(select 1 from public.app_profiles where id=provision.actor and role='Administrador' and active) then
    raise exception 'El administrador de la cuenta ya no está activo';
  end if;
  insert into public.app_profiles(id,role,must_change_password) values(new.id,case when provision.kind='mentors' then 'Mentor' else 'Mentoreado' end,true);
  if provision.kind='mentors' then
    select coalesce(array_agg(trim(value)) filter(where trim(value)<>''),'{}') into specialties
      from unnest(string_to_array(coalesce(provision.details->>'expertise',''),',')) value;
    insert into public.mentors(id,user_id,name,email,phone,expertise)
      values(provision.id,new.id,trim(provision.details->>'name'),provision.email,trim(coalesce(provision.details->>'phone','')),specialties);
  else
    insert into public.mentees(id,user_id,name,email,phone,venture)
      values(provision.id,new.id,trim(provision.details->>'name'),provision.email,trim(coalesce(provision.details->>'phone','')),trim(coalesce(provision.details->>'venture','')));
  end if;
  update public.person_accounts set user_id=new.id where id=provision.id;
  insert into public.audit_events(actor,entity,record_id,operation) values(provision.actor,provision.kind,provision.id,'create_account');
  return new;
end $$;
create trigger link_program_account after insert or update of raw_app_meta_data on auth.users for each row execute function public.link_program_person();

create function public.finish_person_account(request_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if public.app_role() is distinct from 'Administrador' then raise exception 'No autorizado' using errcode='42501'; end if;
  update public.person_accounts set sending_until=null where id=request_id;
end $$;

-- Password changes are performed by Supabase Auth, never by a profile edit.
create function public.complete_initial_password() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password and coalesce(new.encrypted_password,'')<>'' then
    update public.app_profiles set must_change_password=false where id=new.id;
  end if;
  return new;
end $$;
create trigger program_password_changed after update of encrypted_password on auth.users
  for each row execute function public.complete_initial_password();
create function public.get_account_access() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('role',role,'mustChangePassword',must_change_password)
  from public.app_profiles where id=auth.uid() and active
$$;
create or replace function public.app_role() returns text language sql stable security definer set search_path='' as $$
  select role from public.app_profiles where id=auth.uid() and active and not must_change_password
$$;
revoke all on function public.prepare_person_account(uuid,text,jsonb),public.link_program_person(),public.finish_person_account(uuid),public.complete_initial_password(),public.get_account_access() from public,anon,authenticated;
grant execute on function public.prepare_person_account(uuid,text,jsonb),public.finish_person_account(uuid),public.get_account_access() to authenticated;
commit;
