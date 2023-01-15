import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";
import remarkMermaid from "@southball/remark-mermaid";

export default defineConfig({
  integrations: [tailwind()],
  markdown: {
    remarkPlugins: [[remarkMermaid, { themes: ["dark", "neutral"] }]],
  },
});
