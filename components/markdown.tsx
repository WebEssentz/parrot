import Link from "next/link"
import React, { memo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm" // Keep GFM for table support
import { CodeBlock } from "./code-block"
import { cn } from "@/lib/utils" // Assuming you have cn utility

const components: Partial<Components> = {
  // --- Blockquote Styling ---
  blockquote: ({ node, children, ...props }) => (
    <blockquote
      className="relative my-4 border-l-4 border-zinc-300 dark:border-zinc-700 rounded"
      style={{
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
      }}
      {...props}
    >
      {/* Always wrap the main quote in a <p> if not already */}
      {React.Children.map(children, (child) => {
        if (typeof child === "string") {
          return <p className="mb-0 mt-0 text-zinc-800 dark:text-zinc-100 text-base">{child}</p>
        }
        // If already a <p>, just add classes (safely cast props)
        if (
          React.isValidElement(child) &&
          (child.type === "p" || (typeof child.type === "function" && child.type.name === "p"))
        ) {
          const props = (child.props ?? {}) as { className?: string }
          // Workaround: safely access child.props as any
          // Use spread to merge className for <p> only, fallback for others
          if (child.type === "p") {
            const childProps = (child as any).props || {}
            return React.createElement(
              "p",
              {
                ...childProps,
                className: cn(childProps.className, "mb-0 mt-0 text-zinc-800 dark:text-zinc-100 text-base"),
              },
              childProps.children,
            )
          }
          return child
        }
        return child
      })}
    </blockquote>
  ),
  // --- Code Block Handling (Keep As Is) ---
  code(props) {
    const { children, className, node, ...rest } = props
    const match = /language-(\w+)/.exec(className || "")

    // Determine if it's inline code or a block
    // Inline code from single backticks typically doesn't have a language class
    // and its parent node in the AST is not 'pre'.
    const isInline = !match && node?.position?.start?.line === node?.position?.end?.line
    // More robust check: does it have a language class OR is its parent <pre>?
    // react-markdown might not expose parent easily, rely on className or inline heuristic.
    // Let's stick to the className check as the primary indicator for block code.

    if (!isInline && match) {
      // It's a fenced code block, render the CodeBlock component
      return (
        <CodeBlock
          node={node}
          inline={false} // NO LONGER NEEDED - CodeBlock only handles blocks
          className={className || ""}
          {...rest} // Pass other props like style if needed
        >
          {String(children).replace(/\n$/, "")}
        </CodeBlock>
      )
    } else {
      // It's inline code, render a styled <code> tag directly
      return (
        <code
          className={cn(
            // Base styling for inline code (ChatGPT-like)
            "relative rounded bg-zinc-200/50 dark:bg-zinc-700/50 px-[0.4em] py-[0.2em] font-mono text-[0.9em]", // Adjusted sizes slightly
            className, // Allow additional classes if needed, though unlikely for inline
          )}
          {...rest}
        >
          {children}
        </code>
      )
    }
  },

  // --- Paragraph Styling ---
  p: ({ node, children, ...props }) => (
    <p className="mb-2" {...props}>
      {children}
    </p>
  ),

  pre: ({ children }) => <>{children}</>, // Keep pre wrapper simple

  // --- List Styling (Keep As Is or Adjust if needed) ---
  ol: ({ node, children, ...props }) => (
    <ol className="list-decimal list-outside ml-6 space-y-1" {...props}>
      {children}
    </ol> // Adjusted spacing/margin
  ),
  ul: ({ node, children, ...props }) => (
    <ul className="list-disc list-outside ml-6 space-y-1" {...props}>
      {children}
    </ul> // Adjusted spacing/margin
  ),

  li: ({ node, children, ...props }) => (
    <li className="pl-1" {...props}>
      {children}
    </li> // Slight padding adjustment
  ),

  // --- Text Styling (Keep As Is) ---
  strong: ({ node, children, ...props }) => (
    <span className="font-semibold" {...props}>
      {children}
    </span>
  ),
  em: ({ node, children, ...props }) => (
    <span className="italic" {...props}>
      {children}
    </span>
  ),
  a: ({ node, children, ...props }) => (
    // @ts-expect-error
    <Link className="text-blue-600 hover:underline dark:text-blue-400" target="_blank" rel="noreferrer" {...props}>
      {children}
    </Link>
  ),

  // --- Heading Styling (Keep As Is or Adjust) ---
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h1>
    )
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h2>
    )
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h3>
    )
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
        {children}
      </h4>
    )
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        {children}
      </h5>
    )
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        {children}
      </h6>
    )
  },
  // --- UPDATED Table Styling to match ChatGPT exactly ---
  table: ({ node, children, ...props }) => (
    // No container div with border, just the table itself
    <table className="my-4 w-full text-sm border-collapse" {...props}>
      {children}
    </table>
  ),
  thead: ({ node, children, ...props }) => (
    // No background color for header
    <thead {...props}>{children}</thead>
  ),
  tbody: ({ node, children, ...props }) => <tbody {...props}>{children}</tbody>,
  tr: ({ node, children, ...props }) => (
    // Add bottom border to create the horizontal separator
    <tr className="border-b border-zinc-200 dark:border-zinc-700" {...props}>
      {children}
    </tr>
  ),
  th: ({ node, children, ...props }) => (
    // Header cell styling: padding, alignment, font weight
    <th className="py-2 pr-8 text-left font-normal" {...props}>
      {children}
    </th>
  ),
  td: ({ node, children, ...props }) => (
    // Data cell styling: padding, alignment
    <td className="py-2 pr-8 align-top" {...props}>
      {children}
    </td>
  ),
}

const remarkPlugins = [remarkGfm]

// Utility: Remove sources block from markdown string (between <!-- ATLAS_SOURCES_START --> and <!-- ATLAS_SOURCES_END -->)
function stripSourcesBlock(markdown: string): string {
  const start = markdown.indexOf("<!-- ATLAS_SOURCES_START -->")
  const end = markdown.indexOf("<!-- ATLAS_SOURCES_END -->")
  if (start === -1 || end === -1 || end < start) return markdown
  // Remove the block including the markers
  return markdown.slice(0, start) + markdown.slice(end + "<!-- ATLAS_SOURCES_END -->".length)
}

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  // Remove sources block before rendering
  const clean = typeof children === "string" ? stripSourcesBlock(children) : children
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components} rehypePlugins={[rehypeRaw]}>
      {clean}
    </ReactMarkdown>
  )
}

export const Markdown = memo(NonMemoizedMarkdown, (prevProps, nextProps) => prevProps.children === nextProps.children)
