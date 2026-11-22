// 分野のピクトグラム(ビルド時)。
// public/images/fields/<分野>.png があればその URL を返し、なければ undefined(画面では番号を出す)。
// 画像は透明背景の PNG。CSS の mask で型として使い、色は --muted で塗る(.field-icon、global.css)。
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function fieldIcon(id: string): string | undefined {
  if (!existsSync(join(process.cwd(), 'public', 'images', 'fields', `${id}.png`))) return undefined;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/images/fields/${id}.png`;
}
