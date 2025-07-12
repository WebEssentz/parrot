// FILE: lib/markdown-converter.tsx

import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkRehype from "remark-rehype"
import rehypeRaw from "rehype-raw"
import rehypeKatex from "rehype-katex"
import rehypeStringify from "rehype-stringify"
import type { KatexOptions } from "katex"

const katexOptions: KatexOptions = {
  trust: true,
  throwOnError: false,
}

function stripSourcesBlock(markdown: string): string {
  const start = markdown.indexOf("<!-- AVURNA_SOURCES_START -->")
  const end = markdown.indexOf("<!-- AVURNA_SOURCES_END -->")
  if (start === -1 || end === -1 || end < start) return markdown
  return markdown.slice(0, start) + markdown.slice(end + "<!-- AVURNA_SOURCES_END -->".length)
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const cleanMarkdown = stripSourcesBlock(markdown)

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex, katexOptions)
    .use(rehypeStringify)
    .process(cleanMarkdown)

  return String(file)
}

export async function htmlToMarkdown(html: string): Promise<string> {
  // You can use a library like turndown for HTML to markdown conversion
  // For now, we'll return the HTML as-is since TipTap handles markdown conversion
  return html
}
