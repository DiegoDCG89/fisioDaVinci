-- =====================================================================
-- Fisio DuVinci — esquema do Supabase
-- Rode este arquivo UMA vez em: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- 1) Tabelas ----------------------------------------------------------
create table if not exists public."Perfis_Online" (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null,
  xp_total      integer not null default 0 check (xp_total >= 0),
  atualizado_em timestamptz not null default now()
);

-- Nome de usuário único, sem diferenciar maiúsculas de minúsculas.
create unique index if not exists perfis_online_username_unico
  on public."Perfis_Online" (lower(username));

create table if not exists public."Seguidores" (
  seguidor_id uuid not null references auth.users(id) on delete cascade,
  seguido_id  uuid not null references auth.users(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  primary key (seguidor_id, seguido_id),
  check (seguidor_id <> seguido_id)
);

-- 2) Segurança (RLS): obrigatória, pois a chave "anon" fica dentro do app -----
alter table public."Perfis_Online" enable row level security;
alter table public."Seguidores"    enable row level security;

drop policy if exists "perfis_leitura_publica" on public."Perfis_Online";
create policy "perfis_leitura_publica" on public."Perfis_Online"
  for select to anon, authenticated using (true);

drop policy if exists "perfis_insert_proprio" on public."Perfis_Online";
create policy "perfis_insert_proprio" on public."Perfis_Online"
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "perfis_update_proprio" on public."Perfis_Online";
create policy "perfis_update_proprio" on public."Perfis_Online"
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "seguidores_leitura_propria" on public."Seguidores";
create policy "seguidores_leitura_propria" on public."Seguidores"
  for select to authenticated using (auth.uid() = seguidor_id);

drop policy if exists "seguidores_insert_proprio" on public."Seguidores";
create policy "seguidores_insert_proprio" on public."Seguidores"
  for insert to authenticated with check (auth.uid() = seguidor_id);

drop policy if exists "seguidores_delete_proprio" on public."Seguidores";
create policy "seguidores_delete_proprio" on public."Seguidores"
  for delete to authenticated using (auth.uid() = seguidor_id);

-- 3) O XP nunca diminui por uma atualização vinda do app -----------------
create or replace function public.proteger_xp()
returns trigger language plpgsql as $$
begin
  if new.xp_total < old.xp_total then
    new.xp_total := old.xp_total;
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists proteger_xp_trigger on public."Perfis_Online";
create trigger proteger_xp_trigger
  before update on public."Perfis_Online"
  for each row execute function public.proteger_xp();

-- 4) Cria o perfil online automaticamente ao cadastrar um usuário ---------
create or replace function public.criar_perfil_online()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public."Perfis_Online" (id, username)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_online();
