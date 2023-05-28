import { defineConfig } from "astro/config";
import remarkMermaid from "@southball/remark-mermaid";

export default defineConfig({
  markdown: {
    remarkPlugins: [[remarkMermaid, { themes: ["dark", "neutral"] }]],
    shikiConfig: {
      theme: "css-variables"
    }
  },
});
