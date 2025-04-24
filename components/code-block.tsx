'use client';

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Download as DownloadIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { solarizedlight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useEffect, useState } from "react";
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import markdown from 'highlight.js/lib/languages/markdown';
import java from 'highlight.js/lib/languages/java';
import go from 'highlight.js/lib/languages/go';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import sql from 'highlight.js/lib/languages/sql';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('java', java);
hljs.registerLanguage('go', go);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('php', php);
hljs.registerLanguage('sql', sql);

const THEMES = [
  { name: "One Dark", value: oneDark },
  { name: "Dracula", value: dracula },
  { name: "Solarized Light", value: solarizedlight },
];

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();
  const [themeIndex, setThemeIndex] = useState(0);

  // Set default theme based on next-themes (light/dark)
  useEffect(() => {
    if (theme === "light") setThemeIndex(2); // Solarized Light index
    else setThemeIndex(0); // One Dark for dark/system
  }, [theme]);

  // Extract language from className (e.g., language-js)
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  // Language auto-detection if not specified
  let detectedLanguage = language;
  if (!detectedLanguage) {
    try {
      const result = hljs.highlightAuto(codeString);
      detectedLanguage = result.language || "plaintext";
    } catch {
      detectedLanguage = "plaintext";
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  // Count code lines for collapse message
  const codeLines = codeString.split('\n').length;

  // Custom SVGs for Copy and Kebab (three dots)
  const CustomCopyIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-[2] size-4"><rect x="3" y="8" width="13" height="13" rx="4" stroke="currentColor"></rect><path fillRule="evenodd" clipRule="evenodd" d="M13 2.00004L12.8842 2.00002C12.0666 1.99982 11.5094 1.99968 11.0246 2.09611C9.92585 2.31466 8.95982 2.88816 8.25008 3.69274C7.90896 4.07944 7.62676 4.51983 7.41722 5.00004H9.76392C10.189 4.52493 10.7628 4.18736 11.4147 4.05768C11.6802 4.00488 12.0228 4.00004 13 4.00004H14.6C15.7366 4.00004 16.5289 4.00081 17.1458 4.05121C17.7509 4.10066 18.0986 4.19283 18.362 4.32702C18.9265 4.61464 19.3854 5.07358 19.673 5.63807C19.8072 5.90142 19.8994 6.24911 19.9488 6.85428C19.9992 7.47112 20 8.26343 20 9.40004V11C20 11.9773 19.9952 12.3199 19.9424 12.5853C19.8127 13.2373 19.4748 13.8114 19 14.2361V16.5829C20.4795 15.9374 21.5804 14.602 21.9039 12.9755C22.0004 12.4907 22.0002 11.9334 22 11.1158L22 11V9.40004V9.35725C22 8.27346 22 7.3993 21.9422 6.69141C21.8826 5.96256 21.7568 5.32238 21.455 4.73008C20.9757 3.78927 20.2108 3.02437 19.27 2.545C18.6777 2.24322 18.0375 2.1174 17.3086 2.05785C16.6007 2.00002 15.7266 2.00003 14.6428 2.00004L14.6 2.00004H13Z" fill="currentColor"></path></svg>
  );
  const CustomKebabIcon = (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-4"><path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM12.5 8.625C13.1213 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1213 6.375 12.5 6.375C11.8787 6.375 11.375 6.87868 11.375 7.5C11.375 8.12132 11.8787 8.625 12.5 8.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
  );

  // Map detected language to file extension
  const LANGUAGE_EXTENSIONS: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    bash: "sh",
    json: "json",
    xml: "xml",
    css: "css",
    markdown: "md",
    java: "java",
    go: "go",
    c: "c",
    cpp: "cpp",
    ruby: "rb",
    php: "php",
    sql: "sql",
    plaintext: "txt",
  };

  // Download code as file
  const handleDownload = () => {
    const blob = new Blob([codeString], { type: "text/plain" });
    const ext = LANGUAGE_EXTENSIONS[detectedLanguage] || detectedLanguage || "txt";
    const filename = `code-block.${ext}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!inline) {
    return (
      <TooltipProvider>
        <div className="not-prose relative flex flex-col my-4 group/codeblock w-full max-w-xl sm:max-w-2xl mx-auto">
          {/* Code block header */}
          <div
            className="flex items-center justify-between px-2 sm:px-4 py-2 rounded-t-xl border-b border-zinc-200 dark:border-zinc-700"
            style={{
              background:
                theme === "light"
                  ? "#f3f4f6"
                  : "#23272e",
            }}
          >
            {/* Language badge at left with tooltip */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 cursor-pointer">
                    {detectedLanguage}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black">
                  {detectedLanguage === 'plaintext' ? 'Plain text (auto-detected)' : `Language: ${detectedLanguage}`}
                </TooltipContent>
              </Tooltip>
            </div>
            {/* Copy button at right end, kebab menu beside it */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 p-1 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                    aria-label="Copy code"
                    type="button"
                  >
                    {CustomCopyIcon}
                    <span className="text-xs font-medium">Copy</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black">
                  Copy
                </TooltipContent>
              </Tooltip>
              {/* Kebab menu for more options */}
              <div className="relative group/kebab">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-1 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 flex items-center"
                      aria-label="More code actions"
                      type="button"
                    >
                      {CustomKebabIcon}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black">
                    More
                  </TooltipContent>
                </Tooltip>
                <div className="absolute right-0 top-8 z-20 hidden group-hover/kebab:flex flex-col min-w-[120px] rounded-md shadow-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 animate-fade-in">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs border-b border-zinc-200 dark:border-zinc-700 last:border-b-0"
                  >
                    <DownloadIcon size={16} />
                    Download
                  </button>
                  <button
                    onClick={() => setCollapsed((c) => !c)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs"
                  >
                    {collapsed ? 'Expand code' : 'Collapse code'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Code block body */}
          {!collapsed && (
            <div className={
              THEMES[themeIndex].name === "Solarized Light"
                ? "bg-zinc-50 rounded-b-xl overflow-x-auto w-full"
                : "overflow-x-auto rounded-b-xl w-full"
            }>
              <div className="min-w-0 w-full px-2 sm:px-4 py-2 sm:py-4">
                <div className="w-full min-w-0">
                  <SyntaxHighlighter
                    language={detectedLanguage}
                    style={THEMES[themeIndex].value}
                    showLineNumbers
                    customStyle={{
                      backgroundColor: THEMES[themeIndex].name === "Solarized Light" ? "#f8fafc" : "transparent",
                      margin: 0,
                      padding: 0,
                      borderRadius: 0,
                      fontSize: 14,
                      width: '100%',
                      minWidth: 0,
                      overflowX: 'auto',
                    }}
                    codeTagProps={{
                      className: "whitespace-pre break-words font-mono w-full min-w-0",
                    }}
                    {...props}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="italic text-xs text-zinc-400 px-4 py-8 text-center select-none rounded-b-xl">{codeLines} lines hidden</div>
          )}
        </div>
      </TooltipProvider>
    );
  } else {
    // Custom style for inline code (enterprise style)
    let functionName = '';
    let codeContent = String(children);
    // Heuristic: if code is like 'functionName: ...' or 'functionName()', extract function name
    const fnMatch = codeContent.match(/^(\w+)\s*[:(]/);
    if (fnMatch) {
      functionName = fnMatch[1];
    }
    return (
      <span
        className={
          `inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-700 dark:text-zinc-200` +
          (functionName ? ' pl-2 pr-2' : '')
        }
        style={{ fontSize: 13, lineHeight: 1.6 }}
        {...props}
      >
        {functionName && (
          <span className="mr-1 px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-zinc-300 dark:border-zinc-600">
            {functionName}
          </span>
        )}
        {/* No line numbers for inline code */}
        <code className="bg-transparent p-0 m-0 text-xs font-mono">{functionName && fnMatch ? codeContent.replace(fnMatch[0], '').trim() : codeContent}</code>
      </span>
    );
  }
}