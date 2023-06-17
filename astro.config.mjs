import { defineConfig } from "astro/config";
import remarkMermaid from "@southball/remark-mermaid";
import remarkCodeBlockCollapse from "@southball/remark-code-block-collapse";
import remarkToc from "remark-toc";
import rehypeAutolinkHeadings from "rehype-autolink-headings/lib";
import rehypeSlug from "rehype-slug";

export default defineConfig({
  markdown: {
    remarkPlugins: [
      [remarkMermaid, { themes: ["dark", "neutral"] }],
      remarkCodeBlockCollapse,
      [remarkToc, { ordered: true, tight: true }],
    ],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          content: {
            type: "element",
            tagName: "span",
            properties: { className: ["icon-link"] },
            children: [
              {
                type: "element",
                tagName: "svg",
                properties: { viewBox: "0 0 256 256" },
                children: [
                  {
                    type: "element",
                    tagName: "path",
                    properties: {
                      fill: "currentColor",
                      d: "M225.3 82.7a51.8 51.8 0 0 1-15.3 36.8l-28.3 28.3a52 52 0 0 1-73.5 0 8 8 0 1 1 11.3-11.3 36.1 36.1 0 0 0 50.9 0l28.3-28.3a36 36 0 1 0-50.9-50.9L128 77.1a8 8 0 0 1-11.3-11.3L136.5 46a52.1 52.1 0 0 1 88.8 36.7zM128 178.9l-19.8 19.8a36 36 0 0 1-50.9-50.9l28.3-28.3a36.1 36.1 0 0 1 50.9 0 8 8 0 0 0 11.3-11.3 52 52 0 0 0-73.5 0L46 136.5a52 52 0 1 0 73.5 73.5l19.8-19.8a8 8 0 0 0-11.3-11.3z",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    ],
    remarkRehype: {
      footnoteLabelTagName: "h1",
    },
    shikiConfig: {
      theme: "css-variables",
    },
  },
});
