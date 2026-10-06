// Régénère src/types/database.ts depuis le projet Supabase lié (supabase link).
// N'écrit le fichier que si la génération réussit : une erreur ne l'efface jamais.
// Usage : npm run types:supabase
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const result = spawnSync('npx', ['supabase', 'gen', 'types', 'typescript', '--linked', '--schema', 'public'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
  stdio: ['inherit', 'pipe', 'inherit'],
})

if (result.status !== 0 || !result.stdout.includes('export type Database')) {
  console.error('\nÉchec de la génération : src/types/database.ts n’a pas été modifié.')
  console.error('Vérifiez `npx supabase login` puis `npx supabase link --project-ref <réf>`.')
  process.exit(1)
}

writeFileSync('src/types/database.ts', result.stdout)
console.log('✓ src/types/database.ts régénéré')
