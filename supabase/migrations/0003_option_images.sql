-- BAX — image d'aperçu des options (récupérée depuis le lien)
-- À exécuter une seule fois dans Supabase > SQL Editor, après 0002_item_options.sql.

-- Miniature JPEG dans le bucket task-photos : options/{option_id}.jpg
alter table public.shopping_item_options
  add column image_path text;
