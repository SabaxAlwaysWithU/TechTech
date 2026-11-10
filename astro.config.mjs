import { defineConfig } from 'astro/config';

// GitHub Pages で公開するときは環境変数で site と base を渡す。
// 例: SITE=https://<user>.github.io BASE=/<repo> npm run build
// (.github/workflows/deploy.yml が自動で設定する)
export default defineConfig({
  output: 'static',
  site: process.env.SITE || undefined,
  base: process.env.BASE || '/',
  trailingSlash: 'always',
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
