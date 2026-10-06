-- BAX — sous-tâches (étapes) d'une tâche, un seul niveau
-- À exécuter une seule fois dans Supabase > SQL Editor, après 0003_option_images.sql.

create table public.task_subtasks (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks (id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  done         boolean not null default false,
  position     integer not null default 0,
  created_by   uuid not null default auth.uid() references public.profiles (id),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index task_subtasks_task_id_idx on public.task_subtasks (task_id, position);

-- completed_at suit la case cochée
create function public.subtasks_sync_completed_at() returns trigger
language plpgsql as $$
begin
  if new.done then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger subtasks_sync_completed_at
before insert or update of done on public.task_subtasks
for each row execute function public.subtasks_sync_completed_at();

-- Validation automatique de la tâche : la règle n'existe qu'ici.
--  · cocher la dernière étape        → la tâche passe « done »
--  · décocher une étape              → une tâche « done » repasse « in_progress »
--  · ajouter une étape non cochée    → une tâche « done » repasse « in_progress »
-- Supprimer une étape ou créer des étapes déjà cochées ne termine jamais la tâche.
-- completed_at de la tâche est géré par le trigger tasks_sync_completed_at existant.
create function public.subtasks_sync_task_status() returns trigger
language plpgsql as $$
begin
  -- Verrou sur la tâche : deux téléphones qui cochent en même temps ne se contredisent pas.
  perform 1 from public.tasks where id = new.task_id for update;
  if tg_op = 'UPDATE' and new.done then
    if not exists (select 1 from public.task_subtasks where task_id = new.task_id and not done) then
      update public.tasks set status = 'done' where id = new.task_id and status <> 'done';
    end if;
  elsif not new.done then
    update public.tasks set status = 'in_progress' where id = new.task_id and status = 'done';
  end if;
  return null;
end $$;

create trigger subtasks_sync_task_status_insert
after insert on public.task_subtasks
for each row when (not new.done)
execute function public.subtasks_sync_task_status();

create trigger subtasks_sync_task_status_update
after update of done on public.task_subtasks
for each row when (old.done is distinct from new.done)
execute function public.subtasks_sync_task_status();

-- Mêmes règles que les autres tables
alter table public.task_subtasks enable row level security;
create policy "authenticated_all" on public.task_subtasks
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.task_subtasks;
