import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  { name: 'bax/files', files: ['**/*.{ts,mts,vue}'] },
  { name: 'bax/ignores', ignores: ['dist/**', 'dev-dist/**', 'node_modules/**', 'src/types/database.ts'] },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
)
