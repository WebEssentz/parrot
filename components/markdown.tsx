// FILE: components/Markdown.tsx

import Link from "next/link";
import React, { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { CodeBlock } from "./code-block";
import { cn } from "@/lib/utils";
import type { KatexOptions } from "katex";

const components: Partial<Components> = {
  // THIS IS THE CORRECT, CHATGPT-STYLE VERSION
  hr: ({ node, ...props }) => (
    <hr
      className="w-full h-0.5 my-3 border-t border-zinc-200 dark:border-zinc-700/70"
      {...props}
    />
  ),

  // ... other components like blockquote, p, ul, etc. remain the same ...
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
      {React.Children.map(children, (child) => {
        if (typeof child === "string") {
          return <p className="mb-0 mt-0 text-zinc-800 dark:text-zinc-100 text-base leading-relaxed">{child}</p>
        }
        if (
          React.isValidElement(child) &&
          (child.type === "p" || (typeof child.type === "function" && child.type.name === "p"))
        ) {
          if (child.type === "p") {
            const childProps = (child as any).props || {}
            return React.createElement(
              "p",
              {
                ...childProps,
                className: cn(childProps.className, "mb-0 mt-0 text-zinc-800 dark:text-zinc-100 text-base leading-relaxed"),
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

  code(props) {
    const { children, className, node, ...rest } = props;
    const match = /language-(\w+)/.exec(className || "");

    if (match) {
      return (
        <CodeBlock
          node={node}
          inline={false}
          className={className || ""}
          {...rest}
        >
          {String(children).replace(/\n$/, "")}
        </CodeBlock>
      );
    }

    return (
      <code
        className={cn(
          "relative rounded bg-zinc-200 dark:bg-zinc-700/50 px-[0.4rem] py-[0.2rem] font-mono text-[0.9em]",
          className,
        )}
        {...rest}
      >
        {children}
      </code>
    );
  },

  p: ({ node, children, ...props }) => (
  <p 
    className="mb-4 leading-relaxed max-w-none" 
    style={{ fontSize: "16px", lineHeight: "1.8" }}
    {...props}
  >
    {children}
  </p>
),
  pre: ({ children }) => <>{children}</>,
  ol: ({ node, children, ...props }) => (
    <ol className="list-decimal list-outside ml-6 my-4 space-y-1.5" {...props}>
      {children}
    </ol>
  ),
  ul: ({ node, children, ...props }) => (
    <ul className="list-disc list-outside ml-6 my-4 space-y-1.5" {...props}>
      {children}
    </ul>
  ),
  li: ({ node, children, ...props }) => (
    <li className="pl-1 pb-2 leading-relaxed" {...props}>
      {children}
    </li>
  ),
  strong: ({ node, children, ...props }) => (
    <strong className="font-semibold" {...props}>
      {children}
    </strong>
  ),
  em: ({ node, children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  a: ({ node, children, ...props }) => {
    const isSourceButton = node && (node as any).parent &&
      (node as any).parent.type === 'element' &&
      (node as any).parent.properties &&
      Array.isArray((node as any).parent.properties.className) &&
      (node as any).parent.properties.className.includes('source-button-inline');

    const linkClasses = cn(
      {
        "text-blue-600 hover:underline dark:text-blue-400": !isSourceButton,
        "no-underline": isSourceButton,
      },
      (props as any).className
    );

    return (
      <Link href={props.href || ''} className={linkClasses} target="_blank" rel="noreferrer" {...props}>
        {children}
      </Link>
    );
  },
  video: ({ node, ...props }) => (
    <video controls style={{ maxWidth: "100%" }} {...props} />
  ),
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-3 leading-snug" {...props}>
        {children}
      </h1>
    )
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-3 leading-snug" {...props}>
        {children}
      </h2>
    )
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-5 mb-2 leading-snug" {...props}>
        {children}
      </h3>
    )
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-5 mb-2 leading-snug" {...props}>
        {children}
      </h4>
    )
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-5 mb-2 leading-normal" {...props}>
        {children}
      </h5>
    )
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-5 mb-2 leading-normal" {...props}>
        {children}
      </h6>
    )
  },
  table: ({ node, children, ...props }) => {
    return (
      <table className="my-4 w-full text-sm border-collapse" {...props}>
        {children}
      </table>
    );
  },
  thead: ({ node, children, ...props }) => {
    return <thead {...props}>{children}</thead>;
  },
  img: ({ node, ...props }) => (
    <img
      className="max-w-full h-auto rounded-lg my-2 border dark:border-zinc-700"
      {...props}
      alt={props.alt || "Image"}
    />
  ),
  tbody: ({ node, children, ...props }) => {
    return <tbody {...props}>{children}</tbody>;
  },
  tr: ({ node, children, ...props }) => {
    return (
      <tr className="border-b border-zinc-200 dark:border-zinc-700" {...props}>
        {children}
      </tr>
    );
  },
  th: ({ node, children, ...props }) => {
    return <th className="py-2 pr-8 text-left font-normal" {...props}>{children}</th>;
  },
  td: ({ node, children, ...props }) => {
    return <td className="py-2 pr-8 align-top" {...props}>{children}</td>;
  },
}

const remarkPlugins = [remarkGfm, remarkMath];

const katexOptions: KatexOptions = {
  trust: true,
  throwOnError: false,
};

function stripSourcesBlock(markdown: string): string {
  const start = markdown.indexOf("<!-- AVURNA_SOURCES_START -->");
  const end = markdown.indexOf("<!-- AVURNA_SOURCES_END -->");
  if (start === -1 || end === -1 || end < start) return markdown;
  return markdown.slice(0, start) + markdown.slice(end + "<!-- AVURNA_SOURCES_END -->".length);
}

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const clean = typeof children === "string" ? stripSourcesBlock(children) : children;
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={[rehypeRaw, [rehypeKatex, katexOptions]]}
      components={components}
    >
      {clean}
    </ReactMarkdown>
  );
};

export const Markdown = memo(NonMemoizedMarkdown, (prevProps, nextProps) => prevProps.children === nextProps.children);