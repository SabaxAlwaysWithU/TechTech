import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 記事: content/<分野>/<レッスン>/article.md
// id は "<分野>/<レッスン>" になる(例: sql/02-select)
const articles = defineCollection({
  loader: glob({
    pattern: '*/*/article.md',
    base: './content',
    generateId: ({ entry }) => entry.replace(/\\/g, '/').replace(/\/article\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { articles };
