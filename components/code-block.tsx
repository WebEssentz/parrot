// FILE: components/code-block.tsx (FINAL, CORRECTED VERSION)

'use client';

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { ChevronsUpDown, Copy, Download, Paintbrush } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

// Theme imports...
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { materialLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { materialOceanic } from "react-syntax-highlighter/dist/esm/styles/prism";
import { nord } from "react-syntax-highlighter/dist/esm/styles/prism";
import { solarizedlight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { synthwave84 } from "react-syntax-highlighter/dist/esm/styles/prism";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { vs as vsLight } from "react-syntax-highlighter/dist/esm/styles/prism";

// --- THEME SELECTOR LOGIC ---
const THEMES = {
  dark: [
    { name: "One Dark", value: oneDark },
    { name: "VS Code Dark", value: vscDarkPlus },
    { name: "Dracula", value: dracula },
    { name: "Material Dark", value: materialDark },
    { name: "Material Oceanic", value: materialOceanic },
    { name: "Nord", value: nord },
    { name: "Synthwave '84", value: synthwave84 },
  ],
  light: [
    { name: "One Light", value: oneLight },
    { name: "VS Code Light", value: vsLight },
    { name: "Solarized Light", value: solarizedlight },
    { name: "Material Light", value: materialLight },
  ],
};

const DIAGRAM_LANGUAGES = ['mermaid', 'plantuml', 'nomnoml', 'plaintext', 'text', 'ascii', 'diagram', 'tree'];

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

export function CodeBlock({ node, inline, className, children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { theme: appTheme } = useTheme();

  const [selectedThemeName, setSelectedThemeName] = useState("One Dark");
  const [syntaxTheme, setSyntaxTheme] = useState(() => oneDark);

  useEffect(() => {
    const savedTheme = localStorage.getItem("code-theme");
    const currentMode = appTheme === 'light' ? 'light' : 'dark';
    const availableThemes = THEMES[currentMode];
    
    const foundTheme = availableThemes.find(t => t.name === savedTheme);

    if (foundTheme) {
      setSelectedThemeName(foundTheme.name);
      setSyntaxTheme(() => foundTheme.value);
    } else {
      setSelectedThemeName(availableThemes[0].name);
      setSyntaxTheme(() => availableThemes[0].value);
    }
  }, [appTheme]);

  const handleThemeChange = (themeName: string) => {
    const currentMode = appTheme === 'light' ? 'light' : 'dark';
    const theme = THEMES[currentMode].find(t => t.name === themeName);
    if (theme) {
      setSelectedThemeName(theme.name);
      setSyntaxTheme(() => theme.value);
      localStorage.setItem("code-theme", theme.name);
    }
  };
  
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "plaintext";
  const isDiagram = DIAGRAM_LANGUAGES.includes(language);
  const codeString = String(children).replace(/\n$/, "");
  const codeLines = codeString.split('\n').length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy.");
      setCopied(false);
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([codeString], { type: "text/plain" });
      const ext = language === 'plaintext' ? 'txt' : language;
      const filename = `avurna-code.${ext}`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${filename}`);
    } catch {
       toast.error("Download failed.");
    }
  };

  if (inline) {
    return (
      <code className="font-mono relative rounded bg-zinc-200 dark:bg-zinc-700/50 px-[0.4rem] py-[0.2rem] text-sm break-words">
        {children}
      </code>
    );
  }
  
  const containerBgColor = syntaxTheme?.['pre[class*="language-"]']?.background || (appTheme === 'dark' ? '#1f2937' : '#f9fafb');

  return (
    <TooltipProvider>
      {/* This outer div is unnecessary if your parent message component already handles max-width. 
          Keeping it makes the component more robust if used elsewhere. */}
      <div className="max-w-[53rem] mx-auto w-full">
        <div
          className="not-prose relative my-4 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50"
          style={{ backgroundColor: String(containerBgColor) }}
        >
          {/* --- Header --- */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-black/10">
            <span className="text-xs font-sans text-zinc-400 select-none capitalize">
              {language}
            </span>
            <div className="flex items-center gap-1">
              {/* Menu, Copy, Download, Collapse Buttons... */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild><DropdownMenuTrigger asChild><button className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"><Paintbrush className="size-3.5" /></button></DropdownMenuTrigger></TooltipTrigger>
                  <TooltipContent>Change Theme</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Code Theme</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={selectedThemeName} onValueChange={handleThemeChange}>
                    {(appTheme === 'light' ? THEMES.light : THEMES.dark).map(theme => (
                      <DropdownMenuRadioItem key={theme.name} value={theme.name}>{theme.name}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild><button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"><Copy className="size-3.5" /></button></TooltipTrigger>
                <TooltipContent>{copied ? 'Copied!' : 'Copy to clipboard'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild><button onClick={handleDownload} className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"><Download className="size-3.5" /></button></TooltipTrigger>
                <TooltipContent>Download .{language === 'plaintext' ? 'txt' : language}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild><button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"><ChevronsUpDown className="size-3.5" /></button></TooltipTrigger>
                <TooltipContent>{collapsed ? `Show ${codeLines} lines` : 'Collapse'}</TooltipContent>
              </Tooltip>
            </div>
          </div>

           <div className={!collapsed ? "block" : ""}>
            {!collapsed && (
              <SyntaxHighlighter
                language={language}
                style={syntaxTheme}
                showLineNumbers={false}

                // --- THE FIX IS HERE ---
                // 1. Enable line wrapping using the library's prop
                wrapLines={true}
                
                // 2. Apply the "safest combo" styles to the inner <code> tag
                codeTagProps={{
                  style: {
                    whiteSpace: "pre-wrap",
                    overflowWrap: "break-word",
                    fontFamily: "inherit", // Ensure it inherits the mono font
                  },
                }}
                
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  backgroundColor: 'transparent',
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}
                {...props}
              >
                {codeString}
              </SyntaxHighlighter>
            )}
          </div>
          
          {collapsed && (
            <div className="italic text-xs text-zinc-500 text-center select-none py-4 border-t border-white/5">
              {codeLines} lines hidden...
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}