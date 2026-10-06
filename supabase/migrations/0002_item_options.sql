-- BAX — options d'achat (liens) pour les articles
-- À exécuter une seule fois dans Supabase > SQL Editor, après 0001_init.sql.

create table public.shopping_item_options (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.shopping_items (id) on delete cascade,
  url        text not null check (url ~* '^https?://[^\s/?#]+\.[^\s/?#]+'),
  label      text,
  price      numeric(10, 2) check (price >= 0), -- prix de la ligne, quantité comprise
  note       text,
  position   integer not null default 0,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (id, item_id) -- cible de la clé étrangère composite ci-dessous
);
create index shopping_item_options_item_id_idx on public.shopping_item_options (item_id, position);

-- L'option retenue doit appartenir à l'article ; supprimer l'option remet le choix à null.
alter table public.shopping_items
  add column chosen_option_id uuid,
  add constraint shopping_items_chosen_option_fkey
    foreign key (chosen_option_id, id)
    references public.shopping_item_options (id, item_id)
    on delete set null (chosen_option_id);

-- Mêmes règles que les autres tables
alter table public.shopping_item_options enable row level security;
create policy "authenticated_all" on public.shopping_item_options
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.shopping_item_options;
