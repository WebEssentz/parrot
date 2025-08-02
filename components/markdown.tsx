import Link from "next/link";
import React, { memo, createContext, useContext } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { CodeBlock } from "./code-block";
import { cn } from "@/lib/utils";
import type { KatexOptions } from "katex";

// --- Animation Context (UPDATED) ---
interface AnimationContextType {
  animateChars: boolean;
  isStreaming: boolean; // Flag for typewriter effect
}

const AnimationContext = createContext<AnimationContextType>({
  animateChars: false,
  isStreaming: false,
});

const useAnimationContext = () => useContext(AnimationContext);

// --- Helper Functions (UPDATED & FIXED) ---

// [FIXED] Recursive helper for staggered animation (non-streaming)
const processChildrenForAnimation = (
  children: React.ReactNode,
  shouldAnimate: boolean,
  delayOffset: number = 0
): React.ReactNode => {
  if (!shouldAnimate) {
    return children;
  }
  return React.Children.toArray(children).map((child, childIndex) => {
    if (typeof child === 'string') {
      return (
        <span key={childIndex}>
          {child.split('').map((char, index) => (
            <span
              key={`${char}-${index}`}
              className="char-fade-in"
              style={{ animationDelay: `${delayOffset + (index * 0.02)}s` }}
            >
              {char}
            </span>
          ))}
        </span>
      );
    }
    if (React.isValidElement(child)) {
      // FIX: Assert props type to safely access children.
      const propsWithChildren = child.props as { children?: React.ReactNode };
      if (propsWithChildren.children) {
        return React.cloneElement(
          child,
          { key: child.key || childIndex },
          processChildrenForAnimation(propsWithChildren.children, shouldAnimate, delayOffset)
        );
      }
    }
    return child;
  });
};

// [NEW & FIXED] Recursive helper for streaming animation with stable keys
const processStreamingChildren = (
  nodes: React.ReactNode,
  masterIndex: { count: number } = { count: 0 }
): React.ReactNode => {
  return React.Children.toArray(nodes).map((node) => {
    const nodeKey = `stream-node-${masterIndex.count}`;

    if (typeof node === 'string') {
      return node.split('').map(char => {
        const charIndex = masterIndex.count++;
        return (
          <span key={`char-${charIndex}`} className="streaming-char">
            {char}
          </span>
        );
      });
    }

    if (React.isValidElement(node)) {
      const propsWithChildren = node.props as { children?: React.ReactNode };
      // FIX for "Spread types may only be created from object types":
      // Do not spread node.props. `cloneElement` carries them over automatically.
      // Just provide the new/override props.
      return React.cloneElement(
        node,
        { key: node.key || nodeKey },
        propsWithChildren.children ? processStreamingChildren(propsWithChildren.children, masterIndex) : undefined
      );
    }
    
    return node;
  });
};

// --- Universal Content Processor ---
// This function decides which animation logic to apply based on context
const ProcessedContent = ({ children }: { children: React.ReactNode }) => {
  const { animateChars, isStreaming } = useAnimationContext();

  if (isStreaming) {
    return <>{processStreamingChildren(children)}</>;
  }
  if (animateChars) {
    return <>{processChildrenForAnimation(children, true)}</>;
  }
  return <>{children}</>;
};


// --- Components Object (UPDATED) ---
// All text-based components now use the universal <ProcessedContent> helper.
const components: Partial<Components> = {
  hr: ({ node, ...props }) => (
    <hr className="w-full h-0.5 my-3 border-t border-zinc-200 dark:border-zinc-700/70" {...props} />
  ),
  p: ({ node, children, ...props }) => (
    <p className="mb-4 leading-relaxed max-w-none" style={{ fontSize: "16px", lineHeight: "1.8" }} {...props}>
      <ProcessedContent>{children}</ProcessedContent>
    </p>
  ),
  h1: ({ node, children, ...props }) => (
    <h1 className="text-3xl font-semibold mt-6 mb-3 leading-snug" {...props}>
      <ProcessedContent>{children}</ProcessedContent>
    </h1>
  ),
  h2: ({ node, children, ...props }) => (
    <h2 className="text-2xl font-semibold mt-6 mb-3 leading-snug" {...props}>
      <ProcessedContent>{children}</ProcessedContent>
    </h2>
  ),
  h3: ({ node, children, ...props }) => (
    <h3 className="text-xl font-semibold mt-5 mb-2 leading-snug" {...props}>
      <ProcessedContent>{children}</ProcessedContent>
    </h3>
  ),
  h4: ({ node, children, ...props }) => (
    <h4 className="text-lg font-semibold mt-5 mb-2 leading-snug" {...props}>
      <ProcessedContent>{children}</ProcessedContent>
    </h4>
  ),
  h5: ({ node, children, ...props }) => (
    <h5 className="text-base font-semibold mt-5 mb-2 leading-normal" {...props}>
      <ProcessedContent>{children}</ProcessedContent>
    </h5>
  ),
  h6: ({ node, children, ...props }) => (
    <h6 className="text-sm font-semibold mt-5 mb-2 leading-normal" {...props}>
      <ProcessedContent>{children}</ProcessedContent>
    </h6>
  ),
  li: ({ node, children, ...props }) => (
    <li className="pl-1 pb-2 leading-relaxed" {...props}>
      <ProcessedContent>{children}</ProcessedContent>
    </li>
  ),
  strong: ({ node, children, ...props }) => (
    <strong className="font-semibold" {...props}>
      <ProcessedContent>{children}</ProcessedContent>
    </strong>
  ),
  em: ({ node, children, ...props }) => (
    <em className="italic" {...props}>
      <ProcessedContent>{children}</ProcessedContent>
    </em>
  ),
  blockquote: ({ node, children, ...props }) => (
    <blockquote
      className="relative my-4 border-l-4 border-zinc-300 dark:border-zinc-700 rounded"
      style={{ paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16 }}
      {...props}
    >
      <ProcessedContent>{children}</ProcessedContent>
    </blockquote>
  ),
  a: ({ node, children, ...props }) => {
    const isSourceButton = node && (node as any).parent?.type === 'element' && 
                           Array.isArray((node as any).parent?.properties?.className) &&
                           (node as any).parent.properties.className.includes('source-button-inline');

    const linkClasses = cn(
      { "text-blue-600 hover:underline dark:text-blue-400": !isSourceButton, "no-underline": isSourceButton },
      (props as any).className
    );

    return (
      <Link href={props.href || ''} className={linkClasses} target="_blank" rel="noreferrer" {...props}>
        <ProcessedContent>{children}</ProcessedContent>
      </Link>
    );
  },
  // --- Non-Animated Components ---
  code(props) {
    const { children, className, node, ...rest } = props;
    const match = /language-(\w+)/.exec(className || "");
    if (match) {
      return (
        <CodeBlock node={node} inline={false} className={className || ""} {...rest}>
          {String(children).replace(/\n$/, "")}
        </CodeBlock>
      );
    }
    return (
      <code className={cn("relative rounded-md px-1.5 py-0.5 font-mono text-sm", "bg-zinc-200/50 dark:bg-zinc-800/60", "border border-zinc-300 dark:border-zinc-700/60", "text-amber-700 dark:text-orange-300", className)} {...rest}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  ol: ({ children, ...props }) => <ol className="list-decimal list-outside ml-6 my-4 space-y-1.5" {...props}>{children}</ol>,
  ul: ({ children, ...props }) => <ul className="list-disc list-outside ml-6 my-4 space-y-1.5" {...props}>{children}</ul>,
  img: ({ node, ...props }) => <img className="max-w-full h-auto rounded-lg my-2 border dark:border-zinc-700" {...props} alt={props.alt || "Image"} />,
  video: ({ node, ...props }) => <video controls style={{ maxWidth: "100%" }} {...props} />,
  table: ({ children, ...props }) => <table className="my-4 w-full text-sm border-collapse" {...props}>{children}</table>,
  thead: ({ children, ...props }) => <thead {...props}>{children}</thead>,
  tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
  tr: ({ children, ...props }) => <tr className="border-b border-zinc-200 dark:border-zinc-700" {...props}>{children}</tr>,
  th: ({ children, ...props }) => <th className="py-2 pr-8 text-left font-normal" {...props}>{children}</th>,
  td: ({ children, ...props }) => <td className="py-2 pr-8 align-top" {...props}>{children}</td>,
};

// --- Main Component Setup (UPDATED) ---

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
  animateChars?: boolean;
  isStreaming?: boolean; // New prop for streaming mode
}

const NonMemoizedMarkdown = ({
  children,
  animateChars = false,
  isStreaming = false, // Accept new prop
}: MarkdownProps) => {
  const clean = typeof children === "string" ? stripSourcesBlock(children) : "";

  return (
    // Pass both flags to the context
    <AnimationContext.Provider value={{ animateChars, isStreaming }}>
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

// UPDATE memo to check all relevant props for changes
export const Markdown = memo(NonMemoizedMarkdown, (prevProps, nextProps) =>
  prevProps.children === nextProps.children &&
  prevProps.animateChars === nextProps.animateChars &&
  prevProps.isStreaming === nextProps.isStreaming // Add isStreaming to the check
);