import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    published: z.date(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    icon: z.string().optional(),
    draft: z.boolean().default(false),
    external: z.string().optional(),
  }),
});

export const collections = {
  posts: postsCollection,
};
