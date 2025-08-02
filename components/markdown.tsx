import Link from "next/link";
import React, { memo, createContext, useContext } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { CodeBlock } from "./code-block"; // Ensure named export
import { cn } from "@/lib/utils";
import type { KatexOptions } from "katex";

// --- Animation Context ---
interface AnimationContextType {
  isStreaming: boolean;
}
const AnimationContext = createContext<AnimationContextType>({ isStreaming: false });
const useAnimationContext = () => useContext(AnimationContext);

// --- THE CORRECTED STREAMING HELPER ---
const streamText = (nodes: React.ReactNode): React.ReactNode => {
  let charIndex = 0;
  return React.Children.map(nodes, (node) => {
    if (typeof node === 'string') {
      return node.split('').map((char) => (
        <span key={`char-${charIndex++}`} className="streaming-char">
          {char}
        </span>
      ));
    }
    
    if (React.isValidElement(node)) {
      const props = node.props as { children?: React.ReactNode; className?: string };

      // --- THE USER-INSPIRED FIX ---
      // If we find our gatekeeper div, we stop all recursion and render it as-is.
      if (typeof props.className === 'string' && props.className.includes('code-block-wrapper')) {
        return node;
      }
      
      // If it's not a code block but has children, continue processing.
      if (props.children) {
        return React.cloneElement(
          node,
          {...props},
          streamText(props.children)
        );
      }
    }
    return node;
  });
};

// --- Components Configuration (FINAL & CORRECT) ---
const components: Partial<Components> = {
  // --- Text-based components that SHOULD be animated ---
  p: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    return <p className="mb-4 leading-relaxed max-w-none" style={{ fontSize: "16px", lineHeight: "1.8" }} {...props}>{isStreaming ? streamText(children) : children}</p>;
  },
  h1: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    return <h1 className="text-3xl font-semibold mt-6 mb-3 leading-snug" {...props}>{isStreaming ? streamText(children) : children}</h1>;
  },
  h2: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    return <h2 className="text-2xl font-semibold mt-6 mb-3 leading-snug" {...props}>{isStreaming ? streamText(children) : children}</h2>;
  },
  h3: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    return <h3 className="text-xl font-semibold mt-5 mb-2 leading-snug" {...props}>{isStreaming ? streamText(children) : children}</h3>;
  },
  h4: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    return <h4 className="text-lg font-semibold mt-5 mb-2 leading-snug" {...props}>{isStreaming ? streamText(children) : children}</h4>;
  },
  h5: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    return <h5 className="text-base font-semibold mt-5 mb-2 leading-normal" {...props}>{isStreaming ? streamText(children) : children}</h5>;
  },
  h6: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    return <h6 className="text-sm font-semibold mt-5 mb-2 leading-normal" {...props}>{isStreaming ? streamText(children) : children}</h6>;
  },
  li: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    return <li className="pl-1 pb-2 leading-relaxed" {...props}>{isStreaming ? streamText(children) : children}</li>;
  },
  strong: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    return <strong className="font-semibold" {...props}>{isStreaming ? streamText(children) : children}</strong>;
  },
  em: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    return <em className="italic" {...props}>{isStreaming ? streamText(children) : children}</em>;
  },
  blockquote: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    return <blockquote className="relative my-4 border-l-4 border-zinc-300 dark:border-zinc-700 rounded" style={{ paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16 }} {...props}>{isStreaming ? streamText(children) : children}</blockquote>;
  },

  // --- YOUR ORIGINAL ANCHOR TAG LOGIC (RESTORED) ---
  a: ({ node, children, ...props }) => {
    const { isStreaming } = useAnimationContext();
    const isSourceButton = node && (node as any).parent?.type === 'element' && 
                           Array.isArray((node as any).parent?.properties?.className) &&
                           (node as any).parent.properties.className.includes('source-button-inline');

    const linkClasses = cn(
      { "text-blue-600 hover:underline dark:text-blue-400": !isSourceButton, "no-underline": isSourceButton },
      (props as any).className
    );

    return (
      <Link href={props.href || ''} className={linkClasses} target="_blank" rel="noreferrer" {...props}>
        {isStreaming ? streamText(children) : children}
      </Link>
    );
  },

  // --- Animation-Free Zone ---
  code(props) {
    const { children, className, node, ...rest } = props;
    const match = /language-(\w+)/.exec(className || "");

    if (match) {
      // --- THE GATEKEEPER ---
      // We wrap the CodeBlock in our marker div. The streaming helper will see
      // this div and refuse to animate its contents.
      return (
        <div className="code-block-wrapper">
          <CodeBlock node={node} inline={false} className={className || ""} {...rest}>
            {String(children).replace(/\n$/, "")}
          </CodeBlock>
        </div>
      );
    }
    
    const { isStreaming } = useAnimationContext();
    return (
      <code className={cn("relative rounded-md px-1.5 py-0.5 font-mono text-sm", "bg-zinc-200/50", "dark:bg-zinc-800/60", "border", "dark:border-zinc-700/60", "text-amber-700", "dark:text-orange-300", className)} {...rest}>
        {isStreaming ? streamText(children) : children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,

  // ... (the rest of your components like hr, ol, ul, table, etc. are correct and remain unchanged)
};

// --- Main Component Setup ---
const remarkPlugins = [remarkGfm, remarkMath];
const katexOptions: KatexOptions = { trust: true, throwOnError: false };

function stripSourcesBlock(markdown: string): string {
  const start = markdown.indexOf("<!-- AVURNA_SOURCES_START -->");
  const end = markdown.indexOf("<!-- AVURNA_SOURCES_END -->");
  if (start === -1 || end === -1) return markdown;
  return markdown.slice(0, start) + markdown.slice(end + "<!-- AVURNA_SOURCES_END -->".length);
}

interface MarkdownProps {
  children: string;
  isStreaming?: boolean;
}

const NonMemoizedMarkdown = ({
  children,
  isStreaming = false,
}: MarkdownProps) => {
  const clean = typeof children === "string" ? stripSourcesBlock(children) : "";

  return (
    <AnimationContext.Provider value={{ isStreaming }}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[rehypeRaw, [rehypeKatex, katexOptions]]}
        components={components}
      >
        {clean}
      </ReactMarkdown>
    </AnimationContext.Provider>
  );
};

export const Markdown = memo(NonMemoizedMarkdown, (prevProps, nextProps) =>
  prevProps.children === nextProps.children &&
  prevProps.isStreaming === nextProps.isStreaming
);