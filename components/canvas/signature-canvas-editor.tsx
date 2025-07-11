"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import type { Article } from "@/lib/db/schema"
import { useDebounce } from "@/hooks/use-debounce"
import { toast } from "sonner"
import { useEditor, EditorContent, BubbleMenu, type Editor } from "@tiptap/react"
import { Typography } from "@tiptap/extension-typography"
import StarterKit from "@tiptap/starter-kit"
import Heading from "@tiptap/extension-heading"
import { Markdown } from "tiptap-markdown"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableHeader from "@tiptap/extension-table-header"
import TableCell from "@tiptap/extension-table-cell"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import { markdownToHtml } from "@/lib/markdown-converter"
import { initSmoothScrolling, smoothScrollConfig } from "@/lib/smooth-scroll"
import { VideoLinkModal } from "../ui/modals/video-link-modal"
import { SimpleColorPicker } from "./color-picker"
import { FontSelector } from "./font-selector"
import { MobileCommandBar } from "../mobile-command-bar"
import { useUser } from "@clerk/nextjs"
import {
  Loader2,
  CheckCircle,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ChevronDown,
  Type,
  Quote,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  CodeIcon as CodeBlockIcon,
  CodeIcon as InlineCodeIcon,
  Play,
  Minus,
  Eraser,
  LinkIcon,
  User,
  Share,
  ChevronLeft,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import TextStyle from "@tiptap/extension-text-style"
import { VideoProcessor } from "@/lib/video-processor"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { History, Tag } from "lucide-react"
import { DeleteDraftModal } from "../ui/modals/delete-draft-modal"
import { EditorWithDragHandles } from "./editor-with-drag-handles"
import { useRouter } from "next/navigation"

// Create lowlight instance
const lowlight = createLowlight(common)

// The props for our component
interface ArticleEditorProps {
  initialArticle: Article & {
    author: { firstName: string | null } | null
  }
}

// Type for tracking the save status
type SaveStatus = "idle" | "saving" | "saved"

// Text format type
type TextFormat = {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}

// Text format options for the dropdown
const textFormats: TextFormat[] = [
  { label: "Text", value: "paragraph", icon: Type },
  { label: "Heading 1", value: "heading1", icon: Heading1 },
  { label: "Heading 2", value: "heading2", icon: Heading2 },
  { label: "Heading 3", value: "heading3", icon: Heading3 },
  { label: "Bullet list", value: "bulletList", icon: List },
  { label: "Numbered list", value: "orderedList", icon: ListOrdered },
  { label: "Blockquote", value: "blockquote", icon: Quote },
  { label: "Task list", value: "taskList", icon: CheckSquare },
]

// Alignment options
const alignmentOptions = [
  { label: "Align Left", value: "left", icon: AlignLeft },
  { label: "Align Center", value: "center", icon: AlignCenter },
  { label: "Align Right", value: "right", icon: AlignRight },
  { label: "Justify", value: "justify", icon: AlignJustify },
]

// Monochromatic Toolbar
const EditorToolbar = ({
  editor,
  onVideoClick,
  isHighlightAvailable,
}: {
  editor: Editor | null
  onVideoClick: () => void
  isHighlightAvailable: boolean
}) => {
  if (!editor) {
    return null
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void
    isActive: boolean
    children: React.ReactNode
    title: string
  }) => (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${
        isActive
          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </motion.button>
  )

  // --- THIS IS THE NEW LOGIC FOR INLINE FONT CHANGES ---
  const handleFontChange = (fontFamily: string) => {
    // Unset the mark if 'Default' is chosen, otherwise set the font family.
    if (fontFamily) {
      editor.chain().focus().setMark("textStyle", { fontFamily }).run()
    } else {
      editor.chain().focus().unsetMark("textStyle").run()
    }
  }

  const getCurrentFont = () => {
    // Ask Tiptap for the `fontFamily` of the currently selected text.
    return editor.getAttributes("textStyle").fontFamily || ""
  }

  const handleCodeBlock = () => {
    editor.chain().focus().toggleCodeBlock().run()
  }

  const handleHorizontalRule = () => {
    editor.chain().focus().setHorizontalRule().run()
  }

  const handleClearFormatting = () => {
    editor.chain().focus().unsetAllMarks().setParagraph().run()
    toast.success("Formatting cleared!")
  }

  const handleHighlight = (color: string) => {
    try {
      if (!isHighlightAvailable) {
        toast.error("Highlight feature not available")
        return
      }
      if (color) {
        editor.chain().focus().setHighlight({ color }).run()
      } else {
        editor.chain().focus().unsetHighlight().run()
      }
    } catch (error) {
      console.error("Highlight error:", error)
      toast.error("Highlight feature not available")
    }
  }

  const getCurrentHighlightColor = () => {
    try {
      if (!editor.extensionManager.extensions.find((ext) => ext.name === "highlight")) {
        return ""
      }
      const attributes = editor.getAttributes("highlight")
      return attributes.color || ""
    } catch (error) {
      console.error("Get highlight color error:", error)
      return ""
    }
  }

  const handleLink = () => {
    const url = window.prompt("Enter URL:")
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={smoothScrollConfig}
      className="hidden md:flex flex-wrap items-center gap-2 p-3 mb-6 sticky top-[73px] z-10 bg-white/90 dark:bg-[#1C1C1C]/90 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg mx-auto w-fit"
    >
      {/* Font and Basic Formatting */}
      <div className="flex items-center gap-1">
        <FontSelector onFontSelect={handleFontChange} currentFont={getCurrentFont()} />
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough (Ctrl+Shift+S)"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <SimpleColorPicker
          onColorSelect={handleHighlight}
          currentColor={getCurrentHighlightColor()}
          isHighlightAvailable={isHighlightAvailable}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Inline Code (Ctrl+E)"
        >
          <InlineCodeIcon className="w-4 h-4" />
        </ToolbarButton>
      </div>
      <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />

      {/* Headings */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1 (Ctrl+Alt+1)"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2 (Ctrl+Alt+2)"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3 (Ctrl+Alt+3)"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
      </div>
      <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />

      {/* Lists */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List (Ctrl+Shift+8)"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List (Ctrl+Shift+7)"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
      </div>
      <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />

      {/* Alignment */}
      <div className="flex items-center gap-1">
        {alignmentOptions.map((alignment) => (
          <ToolbarButton
            key={alignment.value}
            onClick={() => editor.chain().focus().setTextAlign(alignment.value).run()}
            isActive={editor.isActive({ textAlign: alignment.value })}
            title={alignment.label}
          >
            <alignment.icon className="w-4 h-4" />
          </ToolbarButton>
        ))}
      </div>
      <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />

      {/* Media & Special */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={handleLink} isActive={editor.isActive("link")} title="Insert Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onVideoClick} isActive={false} title="Insert Video">
          <Play className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={handleCodeBlock}
          isActive={editor.isActive("codeBlock")}
          title="Code Block (Ctrl+Alt+C)"
        >
          <CodeBlockIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleHorizontalRule} isActive={false} title="Horizontal Rule">
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleClearFormatting} isActive={false} title="Clear Formatting">
          <Eraser className="w-4 h-4" />
        </ToolbarButton>
      </div>
    </motion.div>
  )
}

// Monochromatic Text Format Dropdown
const TextFormatDropdown = ({ editor }: { editor: Editor }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const getCurrentFormat = (): TextFormat => {
    if (editor.isActive("heading", { level: 1 })) {
      return textFormats.find((f) => f.value === "heading1") || textFormats[0]
    }
    if (editor.isActive("heading", { level: 2 })) {
      return textFormats.find((f) => f.value === "heading2") || textFormats[0]
    }
    if (editor.isActive("heading", { level: 3 })) {
      return textFormats.find((f) => f.value === "heading3") || textFormats[0]
    }
    if (editor.isActive("bulletList")) {
      return textFormats.find((f) => f.value === "bulletList") || textFormats[0]
    }
    if (editor.isActive("orderedList")) {
      return textFormats.find((f) => f.value === "orderedList") || textFormats[0]
    }
    if (editor.isActive("blockquote")) {
      return textFormats.find((f) => f.value === "blockquote") || textFormats[0]
    }
    if (editor.isActive("taskList")) {
      return textFormats.find((f) => f.value === "taskList") || textFormats[0]
    }
    return textFormats[0]
  }

  const currentFormat = getCurrentFormat()

  const handleFormatSelect = (format: TextFormat) => {
    switch (format.value) {
      case "paragraph":
        editor.chain().focus().setParagraph().run()
        break
      case "heading1":
        editor.chain().focus().toggleHeading({ level: 1 }).run()
        break
      case "heading2":
        editor.chain().focus().toggleHeading({ level: 2 }).run()
        break
      case "heading3":
        editor.chain().focus().toggleHeading({ level: 3 }).run()
        break
      case "bulletList":
        editor.chain().focus().toggleBulletList().run()
        break
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run()
        break
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run()
        break
      case "taskList":
        editor.chain().focus().toggleTaskList().run()
        break
    }
    setIsOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Text Format"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
      >
        <currentFormat.icon className="w-4 h-4" />
        <span>{currentFormat.label}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3 h-3" />
        </motion.div>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {textFormats.map((format, index) => (
              <motion.button
                key={format.value}
                onClick={() => handleFormatSelect(format)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer"
              >
                <format.icon className="w-4 h-4 text-zinc-500" />
                <span>{format.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Monochromatic Bubble Menu
const BubbleMenuBar = ({ editor, isHighlightAvailable }: { editor: Editor | null; isHighlightAvailable: boolean }) => {
  if (!editor) {
    return null
  }

  const BubbleButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void
    isActive: boolean
    children: React.ReactNode
    title: string
  }) => (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${
        isActive
          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </motion.button>
  )

  const handleHighlight = (color: string) => {
    try {
      if (!isHighlightAvailable) {
        toast.error("Highlight feature not available")
        return
      }
      if (color) {
        editor.chain().focus().setHighlight({ color }).run()
      } else {
        editor.chain().focus().unsetHighlight().run()
      }
    } catch (error) {
      console.error("Highlight error:", error)
      toast.error("Highlight feature not available")
    }
  }

  const getCurrentHighlightColor = () => {
    try {
      if (!editor.extensionManager.extensions.find((ext) => ext.name === "highlight")) {
        return ""
      }
      const attributes = editor.getAttributes("highlight")
      return attributes.color || ""
    } catch (error) {
      console.error("Get highlight color error:", error)
      return ""
    }
  }

  const handleLink = () => {
    const url = window.prompt("Enter URL:")
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 100,
        animation: "shift-away",
        placement: "top",
      }}
      className="flex items-center gap-1 p-2 bg-white/95 dark:bg-[#1C1C1C]/95 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl backdrop-blur-md min-w-fit"
    >
      <div className="flex items-center gap-1">
        <TextFormatDropdown editor={editor} />
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />
        <BubbleButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </BubbleButton>
        <BubbleButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </BubbleButton>
        <BubbleButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </BubbleButton>
        <BubbleButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Inline Code"
        >
          <InlineCodeIcon className="w-4 h-4" />
        </BubbleButton>
        <SimpleColorPicker
          onColorSelect={handleHighlight}
          currentColor={getCurrentHighlightColor()}
          isHighlightAvailable={isHighlightAvailable}
        />
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />
        <BubbleButton onClick={handleLink} isActive={editor.isActive("link")} title="Insert Link">
          <LinkIcon className="w-4 h-4" />
        </BubbleButton>
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />
        {alignmentOptions.map((alignment) => (
          <BubbleButton
            key={alignment.value}
            onClick={() => editor.chain().focus().setTextAlign(alignment.value).run()}
            isActive={editor.isActive({ textAlign: alignment.value })}
            title={alignment.label}
          >
            <alignment.icon className="w-4 h-4" />
          </BubbleButton>
        ))}
      </div>
    </BubbleMenu>
  )
}

// Link tooltip component
const LinkTooltip = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 100,
        placement: "bottom",
      }}
      shouldShow={({ editor, from, to }) => {
        const { state } = editor
        const { doc, selection } = state
        const { $from } = selection
        const linkMark = $from.marks().find((mark) => mark.type.name === "link")
        return !!linkMark
      }}
      className="px-3 py-2 bg-zinc-800 dark:bg-[#1E1E1E] text-white text-xs rounded-md shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span>Ctrl+Click to follow link</span>
      </div>
    </BubbleMenu>
  )
}

// This hook detects if the screen width is mobile/tablet size.
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // The check function
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // Run on mount
    checkScreenSize()

    // Add resize event listener
    window.addEventListener("resize", checkScreenSize)

    // Cleanup listener on unmount
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [breakpoint])

  return isMobile
}

// Main Article Editor Component
export function MonochromaticEditor({ initialArticle }: ArticleEditorProps) {
  const [title, setTitle] = useState(initialArticle.title)
  const [content, setContent] = useState(initialArticle.content_md)
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [isHighlightAvailable, setIsHighlightAvailable] = useState(false)

  // 1. Add state to manage the currently selected font for the entire article.
  // Initialize it with the article's saved font or a default.
  const [articleFont, setArticleFont] = useState<string>(initialArticle.fontFamily || "var(--font-sans)")

  const debouncedTitle = useDebounce(title, 1500)
  const debouncedContent = useDebounce(content, 1500)
  const isMobile = useIsMobile()
  const { user } = useUser()
  const userFullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User"

  // 2. Create a handler function to update the font state and the CSS variable.
  const handleFontSelect = (fontVariable: string) => {
    setArticleFont(fontVariable)
    document.documentElement.style.setProperty("--font-main", fontVariable)
  }

  // 3. Apply the initial font when the component mounts.
  useEffect(() => {
    document.documentElement.style.setProperty("--font-main", articleFont)

    // Optional cleanup: reset to default when the component unmounts
    return () => {
      document.documentElement.style.setProperty("--font-main", "var(--font-sans)")
    }
  }, [articleFont]) // This effect runs when articleFont changes

  // Initialize smooth scrolling
  useEffect(() => {
    initSmoothScrolling()
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-zinc-700 dark:text-zinc-200 underline underline-offset-2 decoration-zinc-400/60 dark:decoration-blue-300/60 hover:text-blue-600 dark:hover:text-blue-400 hover:decoration-blue-600 dark:hover:decoration-blue-400 transition-all duration-200",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-lg my-4 max-w-full h-auto",
        },
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: "highlight-mark",
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "auto",
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Markdown.configure({
        html: true,
        linkify: true,
        breaks: true,
      }),
      TextStyle,
    ],
    editorProps: {
      attributes: {
        class: [
          "prose prose-lg dark:prose-invert focus:outline-none max-w-none smooth-scroll",
          "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:leading-tight [&_h1]:text-zinc-900 [&_h1]:dark:text-zinc-100",
          "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:leading-tight [&_h2]:text-zinc-900 [&_h2]:dark:text-zinc-100",
          "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:leading-tight [&_h3]:text-zinc-900 [&_h3]:dark:text-zinc-100",
          "[&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:leading-tight [&_h4]:text-zinc-900 [&_h4]:dark:text-zinc-100",
          "[&_h5]:text-base [&_h5]:font-semibold [&_h5]:mt-5 [&_h5]:mb-2 [&_h5]:leading-normal [&_h5]:text-zinc-900 [&_h5]:dark:text-zinc-100",
          "[&_h6]:text-sm [&_h6]:font-semibold [&_h6]:mt-5 [&_h6]:mb-2 [&_h6]:leading-normal [&_h6]:text-zinc-900 [&_h6]:dark:text-zinc-100",
          "[&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-zinc-700 [&_p]:dark:text-zinc-300",
          "[&_ul]:list-disc [&_ul]:list-outside [&_ul]:ml-6 [&_ul]:my-4 [&_ul]:space-y-2",
          "[&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-6 [&_ol]:my-4 [&_ol]:space-y-2",
          "[&_li]:text-zinc-700 [&_li]:dark:text-zinc-300 [&_li]:leading-relaxed",
          "[&_strong]:font-semibold [&_strong]:text-zinc-900 [&_strong]:dark:text-zinc-100",
          "[&_em]:italic",
          "[&_blockquote]:relative [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:dark:border-zinc-700 [&_blockquote]:pl-6 [&_blockquote]:italic",
          "[&_code]:relative [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:dark:bg-zinc-800 [&_code]:px-2 [&_code]:py-1 [&_code]:font-mono [&_code]:text-sm",
          "[&_pre]:bg-zinc-900 [&_pre]:text-zinc-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-6",
          "[&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0",
          "[&_table]:my-6 [&_table]:w-full [&_table]:border-collapse",
          "[&_th]:py-2 [&_th]:pr-4 [&_th]:border-collapse [&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:border-zinc-200 [&_th]:dark:border-zinc-700",
          "[&_td]:py-2 [&_td]:pr-4 [&_td]:border-b [&_td]:border-zinc-200 [&_td]:dark:border-zinc-700",
          "[&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-zinc-500",
          "[&_*[style*='text-align: center']]:text-center",
          "[&_*[style*='text-align: right']]:text-right",
          "[&_*[style*='text-align: justify']]:text-justify",
          "[&_*[style*='text-align: left']]:text-left",
          "[&_img]:rounded-lg [&_img]:my-6",
          "[&_hr]:border-zinc-200 [&_hr]:dark:border-zinc-700 [&_hr]:my-8",
          "[&_mark]:px-1 [&_mark]:py-0.5 [&_mark]:rounded",
          // Video embed styles
          "[&_.video-wrapper]:my-6",
          "[&_iframe]:rounded-lg [&_iframe]:w-full",
        ].join(" "),
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.storage.markdown.getMarkdown())
    },
  })

  // Check for highlight extension availability
  useEffect(() => {
    if (editor) {
      const highlightExt = editor.extensionManager.extensions.find((ext) => ext.name === "highlight")
      setIsHighlightAvailable(!!highlightExt)
    }
  }, [editor])

  // Convert markdown to HTML and load into editor
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const convertAndLoad = async () => {
        try {
          const html = await markdownToHtml(initialArticle.content_md)
          editor.commands.setContent(html)
        } catch (error) {
          console.error("Failed to convert markdown to HTML:", error)
          editor.commands.setContent(initialArticle.content_md)
        }
      }

      convertAndLoad()
    }
  }, [editor, initialArticle.content_md])

  // Add custom link click handler after the editor is created
  useEffect(() => {
    if (!editor) return

    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const link = target.closest("a[href]") as HTMLAnchorElement
      if (link && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        event.stopPropagation()
        window.open(link.href, "_blank", "noopener,noreferrer")
      }
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener("click", handleLinkClick)

    return () => {
      editorElement.removeEventListener("click", handleLinkClick)
    }
  }, [editor])

  // Handle video insertion with proper DOM insertion
  const handleVideoInsert = useCallback(
    async (url: string, platform: string) => {
      if (editor) {
        try {
          const detectedPlatform = platform === "auto" ? VideoProcessor.detectPlatform(url) : platform
          const result = await VideoProcessor.processVideoUrl(url, detectedPlatform)
          if (result) {
            // Insert the video HTML directly into the editor with proper spacing
            const videoContent = `<p></p>${result.html}<p></p>`
            editor.chain().focus().insertContent(videoContent).run()
            // Force multiple re-renders to ensure the video appears
            setTimeout(() => {
              editor.commands.focus()
              editor.view.updateState(editor.view.state)
            }, 100)
            setTimeout(() => {
              editor.view.updateState(editor.view.state)
            }, 300)
            toast.success(
              `${result.platform.charAt(0).toUpperCase() + result.platform.slice(1)} video inserted successfully!`,
            )
          } else {
            throw new Error("Failed to process video URL")
          }
        } catch (error) {
          console.error("Video insertion error:", error)
          toast.error("Failed to process video link. Please check the URL and try again.")
        }
      }
    },
    [editor],
  )

  const [showDeleteDraftModal, setShowDeleteDraftModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDeleteDraft = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/articles/${initialArticle.id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete draft")
      toast.success("Draft deleted successfully!")
      router.push("/chat") // Changed from "/" to "/chat"
    } catch (error) {
      toast.error("Failed to delete draft.")
    } finally {
      setIsDeleting(false)
      setShowDeleteDraftModal(false)
    }
  }

  // Auto-save functionality (MODIFIED to include font)
  const handleAutoSave = useCallback(async () => {
    // Now also checks if the font has changed
    if (
      debouncedContent === initialArticle.content_md &&
      debouncedTitle === initialArticle.title &&
      articleFont === (initialArticle.fontFamily || "var(--font-sans)")
    ) {
      return
    }
    setStatus("saving")
    try {
      await fetch(`/api/articles/${initialArticle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: debouncedTitle,
          content_md: debouncedContent,
          fontFamily: articleFont, // --- ADD FONT TO THE PAYLOAD ---
        }),
      })
      setStatus("saved")
      setTimeout(() => setStatus("idle"), 2000)
    } catch (error) {
      toast.error("Failed to save changes.")
      setStatus("idle")
    }
  }, [debouncedContent, debouncedTitle, articleFont, initialArticle]) // Add articleFont dependency

  useEffect(() => {
    handleAutoSave()
  }, [debouncedContent, debouncedTitle, articleFont, handleAutoSave]) // Add articleFont dependency

  // Handle publishing
  const handlePublish = async () => {
    setStatus("saving")
    try {
      await fetch(`/api/articles/${initialArticle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      })
      toast.success("Article published successfully!")
      setStatus("saved")
    } catch (error) {
      toast.error("Failed to publish article.")
      setStatus("idle")
    }
  }

  // Handle share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied to clipboard!")
    }
  }

  // Save status indicator
  const SaveStatusIndicator = () => {
    switch (status) {
      case "saving":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-sm text-zinc-500"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving...</span>
          </motion.div>
        )
      case "saved":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Saved</span>
          </motion.div>
        )
      default:
        return <span className="text-sm text-zinc-500">Last edit a few seconds ago</span>
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-white dark:bg-[#1C1C1C] text-zinc-900 dark:text-zinc-50 smooth-scroll"
      >
        {/* New Header: Three-Zone Command Center */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-20 w-full bg-white/80 dark:bg-[#1C1C1C]/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Zone 1: Identity (Left) - Improved spacing and positioning */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Mobile back button */}
              <button className="md:hidden p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                <ChevronLeft className="w-5 h-5" />
              </button>
              {/* User info with better spacing */}
              <div className="flex items-center gap-3" title={userFullName}>
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl || "/placeholder.svg"}
                    alt={`${user.firstName || user.username || "User"}'s profile`}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    <User className="w-4 h-4 text-white dark:text-zinc-900" />
                  </div>
                )}
                <span className="text-zinc-300 dark:text-zinc-600">/</span>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Draft in {user?.firstName || user?.username || "Workspace"}
                </span>
              </div>
            </div>

            {/* Zone 2: Context (Center) - Save status */}
            <div className="hidden md:flex items-center">
              <SaveStatusIndicator />
            </div>

            {/* Zone 3: Actions (Right) */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="md:hidden">
                <SaveStatusIndicator />
              </div>

              {/* Three-dot menu for secondary actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-48 bg-white dark:bg-[#282828] p-2 shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl"
                >
                  <DropdownMenuItem
                    onSelect={handleShare}
                    className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"
                  >
                    <Share className="w-4 h-4 text-zinc-500" />
                    <span>Share</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => toast.info("Revision history coming soon!")}
                    className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"
                  >
                    <History className="w-4 h-4 text-zinc-500" />
                    <span>Revision History</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => toast.info("Tag management coming soon!")}
                    className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-700/50"
                  >
                    <Tag className="w-4 h-4 text-zinc-500" />
                    <span>Manage Tags</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-200/80 dark:bg-zinc-700/60 my-1 mx-1.5" />
                  <DropdownMenuItem
                    onSelect={() => setShowDeleteDraftModal(true)}
                    className="flex items-center gap-3 cursor-pointer px-2 py-2 text-sm rounded-lg text-red-600 dark:text-red-500 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-500"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-500" />
                    <span>Delete Draft</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <motion.button
                onClick={handlePublish}
                disabled={status === "saving"}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-1.5 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Publish
              </motion.button>
            </div>
          </div>
        </motion.header>

        <main className="w-full">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32">
            {/* Title Input - Large and Prominent */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Start writing..."
                className="w-full resize-none border-none focus:outline-none focus:ring-0
                           text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-transparent p-0
                           placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 smooth-scroll"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  target.style.height = `${target.scrollHeight}px`
                }}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <EditorToolbar
                editor={editor}
                onVideoClick={() => setShowVideoModal(true)}
                isHighlightAvailable={isHighlightAvailable}
              />
              <BubbleMenuBar editor={editor} isHighlightAvailable={isHighlightAvailable} />
              <LinkTooltip editor={editor} />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-4 editor-content"
              >
                <EditorWithDragHandles editor={editor}>
                  <EditorContent editor={editor} />
                </EditorWithDragHandles>
              </motion.div>
            </motion.div>
          </div>
        </main>

        {/* Mobile Command Bar */}
        <MobileCommandBar
          editor={editor}
          onVideoClick={() => setShowVideoModal(true)}
          isHighlightAvailable={isHighlightAvailable}
        />

        <VideoLinkModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          onVideoInsert={handleVideoInsert}
        />
        <DeleteDraftModal
          isOpen={showDeleteDraftModal}
          onClose={() => setShowDeleteDraftModal(false)}
          onConfirm={handleDeleteDraft}
          draftTitle={title || "Untitled Draft"}
          isDeleting={isDeleting}
        />
      </motion.div>
    </DndProvider>
  )
}
