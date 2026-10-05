-- BAX — schéma initial
-- À exécuter une seule fois dans Supabase > SQL Editor (ou via `supabase db push`).

-- ============ Types ============
create type public.task_priority as enum ('high', 'medium', 'low');
create type public.task_status as enum ('todo', 'in_progress', 'done');

-- ============ Tables ============
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  color      text not null -- ex. '#2E5BCC'
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  description text,
  icon        text not null default '📁',
  color       text not null,
  target_date date,
  position    integer not null default 0,
  created_by  uuid not null default auth.uid() references public.profiles (id),
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  description  text,
  priority     public.task_priority not null default 'medium',
  status       public.task_status not null default 'todo',
  target_date  date,
  assignee_ids uuid[] not null default '{}',
  created_by   uuid not null default auth.uid() references public.profiles (id),
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  archived_at  timestamptz
);
create index tasks_project_id_idx on public.tasks (project_id);

create table public.task_photos (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks (id) on delete cascade,
  storage_path text not null unique, -- {task_id}/{id}.jpg ; miniature : {task_id}/{id}_thumb.jpg
  caption      text,
  position     integer not null default 0,
  created_by   uuid not null default auth.uid() references public.profiles (id),
  created_at   timestamptz not null default now()
);
create index task_photos_task_id_idx on public.task_photos (task_id);

create table public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  quantity   integer check (quantity > 0),
  price      numeric(10, 2) check (price >= 0), -- prix de la ligne, quantité comprise
  note       text,
  purchased  boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.task_shopping_items (
  task_id  uuid not null references public.tasks (id) on delete cascade,
  item_id  uuid not null references public.shopping_items (id) on delete cascade,
  position integer not null default 0,
  primary key (task_id, item_id)
);
create index task_shopping_items_item_id_idx on public.task_shopping_items (item_id);

-- ============ Triggers ============
-- completed_at suit le statut (décocher une tâche le remet à null)
create function public.tasks_sync_completed_at() returns trigger
language plpgsql as $$
begin
  if new.status = 'done' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger tasks_sync_completed_at
before insert or update of status on public.tasks
for each row execute function public.tasks_sync_completed_at();

-- Un article qui n'est plus relié à aucune tâche est supprimé
-- (vaut aussi pour la suppression d'une tâche ou d'un projet, par cascade).
create function public.delete_orphan_shopping_item() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.shopping_items i
  where i.id = old.item_id
    and not exists (select 1 from public.task_shopping_items l where l.item_id = old.item_id);
  return null;
end $$;

create trigger delete_orphan_shopping_item
after delete on public.task_shopping_items
for each row execute function public.delete_orphan_shopping_item();

-- Réordonner les projets en un seul appel
create function public.reorder_projects(ids uuid[]) returns void
language sql as $$
  update public.projects p
  set position = o.ord
  from unnest(ids) with ordinality as o (id, ord)
  where p.id = o.id;
$$;

-- ============ RLS : tout utilisateur connecté a tous les droits, aucun accès anonyme ============
do $$
declare t text;
begin
  foreach t in array array['profiles', 'projects', 'tasks', 'task_photos', 'shopping_items', 'task_shopping_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "authenticated_all" on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

revoke execute on function public.reorder_projects(uuid[]) from anon, public;
grant execute on function public.reorder_projects(uuid[]) to authenticated;

-- ============ Realtime ============
alter publication supabase_realtime
  add table public.profiles, public.projects, public.tasks,
            public.task_photos, public.shopping_items, public.task_shopping_items;

-- ============ Storage : bucket privé pour les photos ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-photos', 'task-photos', false, 5242880, array['image/jpeg']);

create policy "task_photos_select" on storage.objects
  for select to authenticated using (bucket_id = 'task-photos');
create policy "task_photos_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'task-photos');
create policy "task_photos_update" on storage.objects
  for update to authenticated using (bucket_id = 'task-photos');
create policy "task_photos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'task-photos');
