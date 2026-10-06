-- BAX — cocher une sous-tâche démarre la tâche
-- À exécuter une seule fois dans Supabase > SQL Editor, après 0004_subtasks.sql.
-- Remplace la fonction du trigger (les triggers existants l'utilisent automatiquement).

-- Validation automatique de la tâche : la règle n'existe qu'ici.
--  · cocher une étape                → une tâche « todo » passe « in_progress »
--  · cocher la dernière étape        → la tâche passe « done »
--  · décocher une étape              → une tâche « done » repasse « in_progress »
--  · ajouter une étape non cochée    → une tâche « done » repasse « in_progress »
-- Supprimer une étape ou créer des étapes déjà cochées ne termine jamais la tâche.
-- completed_at de la tâche est géré par le trigger tasks_sync_completed_at existant.
create or replace function public.subtasks_sync_task_status() returns trigger
language plpgsql as $$
begin
  -- Verrou sur la tâche : deux téléphones qui cochent en même temps ne se contredisent pas.
  perform 1 from public.tasks where id = new.task_id for update;
  if tg_op = 'UPDATE' and new.done then
    if not exists (select 1 from public.task_subtasks where task_id = new.task_id and not done) then
      update public.tasks set status = 'done' where id = new.task_id and status <> 'done';
    else
      update public.tasks set status = 'in_progress' where id = new.task_id and status = 'todo';
    end if;
  elsif not new.done then
    update public.tasks set status = 'in_progress' where id = new.task_id and status = 'done';
  end if;
  return null;
end $$;
