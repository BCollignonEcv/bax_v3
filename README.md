# BAX

Notre petit QG à deux : une PWA « hub » de petits modules du quotidien, réservée à Baptiste et Alix.
Premier module : **Projets** (projets, tâches, photos, listes d'achats et budget).

BAX est un aide-mémoire calme : pas de notification, pas de badge d'urgence, pas de rappel.

- Vue 3 (`<script setup>`), Vite, TypeScript, Tailwind CSS 4
- Vue Router, Pinia
- vite-plugin-pwa (manifest, service worker, consultation hors connexion)
- Supabase : Auth, Postgres + RLS, Storage, Realtime
- Hébergement : Vercel

---

## 1. Démarrer en local

```bash
npm install
cp .env.example .env      # puis renseigner les deux variables (voir § 3)
npm run dev
```

Scripts utiles :

| Commande                 | Rôle                                                  |
| ------------------------ | ----------------------------------------------------- |
| `npm run dev`            | serveur de développement                              |
| `npm run build`          | vérification TypeScript puis build de production      |
| `npm run preview`        | sert le build (pour tester le service worker)         |
| `npm run lint`           | ESLint (corrige ce qui peut l'être)                   |
| `npm run format`         | Prettier sur `src/`                                   |
| `npm run types:supabase` | régénère `src/types/database.ts` depuis Supabase      |
| `npm run icons`          | régénère les icônes PWA dans `public/`                |

---

## 2. Mettre en place Supabase

### 2.1 Créer le projet

Sur [supabase.com](https://supabase.com), créer un projet (région Europe, offre gratuite).

### 2.2 Schéma, RLS, Realtime et Storage

Dans **SQL Editor**, coller et exécuter le contenu de
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Ce script crée :

- les tables `profiles`, `projects`, `tasks`, `task_photos`, `shopping_items`, `task_shopping_items` ;
- les triggers :
  - `completed_at` suit le statut de la tâche ;
  - un article qui n'est plus relié à aucune tâche est supprimé ;
- la fonction `reorder_projects` (réorganisation des projets en un appel) ;
- les **politiques RLS** : tout utilisateur connecté peut tout lire et modifier, aucun accès anonyme ;
- l'activation de **Realtime** sur toutes les tables ;
- le **bucket privé `task-photos`** (JPEG, 5 Mo max) et ses politiques, réservées aux utilisateurs connectés.

> Vérification : dans **Storage**, le bucket `task-photos` apparaît avec « Private ». Dans
> **Database > Publications > supabase_realtime**, les six tables sont cochées.

### 2.3 Désactiver les inscriptions

**Authentication > Sign In / Providers** :

- désactiver **Allow new users to sign up** ;
- laisser le fournisseur **Email** activé (connexion par mot de passe).

### 2.4 Créer les deux comptes

**Authentication > Users > Add user > Create new user**, une fois pour chacun :

- e-mail et mot de passe ;
- cocher **Auto Confirm User**.

### 2.5 Créer les profils

Dans **SQL Editor** (adapter les e-mails) :

```sql
insert into public.profiles (id, first_name, color)
select id, 'Baptiste', '#2E5BCC' from auth.users where email = 'baptiste@exemple.fr';

insert into public.profiles (id, first_name, color)
select id, 'Alix', '#D27420' from auth.users where email = 'alix@exemple.fr';
```

`color` est la couleur de la pastille de chacun. En mode sombre, l'app l'éclaircit automatiquement.

### 2.6 Types TypeScript

`src/types/database.ts` correspond déjà au schéma. Après toute modification du schéma, il faut le régénérer :

```bash
npx supabase login
npx supabase link --project-ref <référence-du-projet>
npm run types:supabase
```

---

## 3. Variables d'environnement

| Variable                 | Où la trouver                                          |
| ------------------------ | ------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | Project Settings > API > Project URL                   |
| `VITE_SUPABASE_ANON_KEY` | Project Settings > API > clé `anon` / publishable      |

Seule la clé publique est utilisée côté client : les droits sont portés par les politiques RLS.
**Ne jamais** mettre la clé `service_role` (ou « secret ») dans l'app ni dans Vercel.

---

## 4. Déployer sur Vercel

1. Pousser le dépôt sur GitHub.
2. Sur [vercel.com](https://vercel.com) : **Add New > Project**, importer le dépôt. Vercel détecte Vite :
   la commande de build est `npm run build` et le dossier de sortie `dist`.
3. **Settings > Environment Variables** : ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
4. Déployer.

`vercel.json` redirige toutes les routes vers `index.html` (application monopage). Il empêche aussi la mise
en cache de `sw.js`, pour que les mises à jour arrivent vite.

Facultatif : dans Supabase, **Authentication > URL Configuration**, renseigner l'URL Vercel comme *Site URL*.

---

## 5. Installer l'app sur le téléphone

### iPhone (Safari)

1. Ouvrir l'URL de l'app dans **Safari**.
2. Bouton **Partager** puis **Sur l'écran d'accueil**.
3. Valider : l'icône « BAX » apparaît et l'app s'ouvre en plein écran.

### Android (Chrome)

1. Ouvrir l'URL dans **Chrome**.
2. Menu **⋮** puis **Installer l'application** (ou **Ajouter à l'écran d'accueil**).

Se connecter une fois : la session reste ouverte sur l'appareil.

---

## 6. Fonctionnement

- **Synchronisation** : les données sont chargées en mémoire (Pinia) et mises à jour en direct par Realtime.
  Au retour au premier plan ou du réseau, tout est rechargé. En cas de modification simultanée, la
  dernière l'emporte.
- **Hors connexion** : la dernière version est enregistrée sur l'appareil (IndexedDB), et les photos déjà
  vues restent en cache. Les données se consultent, mais modifier ou ajouter des photos est bloqué avec un
  message.
- **Annuler** :
  - valider ou archiver s'applique tout de suite, et « Annuler » revient en arrière ;
  - une suppression est différée jusqu'à la fin du toast. Elle s'applique aussi si l'app passe en
    arrière-plan avant.
- **Tâches terminées** : elles restent à leur place. Les tris (création, priorité, date cible) ne tiennent
  jamais compte du statut.
- **Archivage** : il est indépendant du statut. Les tâches d'un projet archivé sortent de la liste de
  courses et des indicateurs de l'accueil.
- **Photos** :
  - compressées sur le téléphone (1600 px max, JPEG 0,8, orientation EXIF respectée, HEIC converti) ;
  - une miniature de 400 px est générée ;
  - affichage par URL signées ;
  - supprimer une photo, une tâche ou un projet supprime aussi les fichiers. Archiver les conserve.
- **Articles** :
  - l'état « acheté » est porté par l'article, partagé entre les tâches qui l'utilisent ;
  - le prix saisi est celui de la ligne, quantité comprise ;
  - le budget d'un projet compte chaque article une seule fois.
- **Liste de courses** : propre à chaque projet (icône panier sur l'écran du projet). Elle montre les
  articles non achetés reliés à une tâche non terminée et non archivée.
- **Saisie rapide** : « Chevilles ×20 » crée l'article « Chevilles » avec la quantité 20.

---

## 7. Architecture

```
src/
  app/
    module.ts         type BaxModule
    modules.ts        registre central des modules
    router.ts         routes de base + routes des modules (depuis le registre)
    bootstrap.ts      démarrage après connexion (cache, Realtime, chargement)
    views/            Connexion, Accueil
  core/               commun à tous les modules
    supabase.ts       client (clé anon)
    sync.ts           Realtime, rechargement, gestion des erreurs d'écriture
    collection.ts     copie locale d'une table
    persist.ts        cache IndexedDB (hors connexion)
    stores/           auth, profils, réseau, toast, confirmation
    components/       feuille du bas, toast, avatars, champs…
  modules/
    projects/
      index.ts        déclaration du module
      routes.ts
      stores/         projets et tâches, photos, articles
      views/ components/ composables/
  types/database.ts   types générés par Supabase
supabase/migrations/  schéma SQL
```

### Ajouter un module

1. Créer `src/modules/<nom>/` avec `index.ts`, `routes.ts`, ses vues, composants, composables et store.
2. Dans `index.ts`, exporter un objet `BaxModule` :

   ```ts
   const budget: BaxModule = {
     id: 'budget',
     name: 'Budget',
     icon: Wallet,
     status: 'active',
     routes,
     to: { name: 'budget' },
     summary: () => '3 enveloppes', // indicateur neutre sur l'accueil
     start: () => useBudgetStore().start(), // cache + Realtime + chargement
   }
   ```

3. L'inscrire dans `src/app/modules.ts` (et retirer l'entrée « Bientôt » correspondante).

Ses routes sont ajoutées au routeur et sa carte apparaît sur l'accueil automatiquement. Les tables d'un
nouveau module s'ajoutent dans une nouvelle migration SQL, avec les mêmes politiques RLS et l'ajout à la
publication `supabase_realtime`.
