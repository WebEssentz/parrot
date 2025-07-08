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
// import { ImageUploadModal } from "./image-upload-modal" // COMMENTED OUT
import { VideoLinkModal } from "./video-link-modal"
import { DraggableContentBlock } from "./draggable-content-block"
import { SimpleColorPicker } from "./color-picker"
import { FontSelector } from "./font-selector"
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
  Play,
  Layers,
  Sparkles,
  Code,
  Minus,
  Eraser,
  LinkIcon,
} from "lucide-react"
import TextStyle from "@tiptap/extension-text-style"
import { VideoProcessor } from "@/lib/video-processor"

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

// Content block type for drag and drop
interface ContentBlock {
  id: string
  content: string
  type: "paragraph" | "heading" | "list"
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

// Enhanced Toolbar with blue theme
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
      className={`p-2 rounded-md transition-all duration-200 cursor-pointer ${
        isActive
          ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shadow-sm"
          : "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
      }`}
    >
      {children}
    </motion.button>
  )

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

  const handleFontChange = (fontFamily: string) => {
    try {
      if (fontFamily) {
        // Apply font family using TextStyle extension
        editor.chain().focus().setMark("textStyle", { fontFamily }).run()
      } else {
        // Remove font family
        editor.chain().focus().unsetMark("textStyle").run()
      }
    } catch (error) {
      console.error("Font change error:", error)
      toast.error("Failed to change font")
    }
  }

  const getCurrentFont = () => {
    try {
      const attributes = editor.getAttributes("textStyle")
      return attributes.fontFamily || ""
    } catch (error) {
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
      className="flex flex-wrap items-center gap-2 p-3 mb-6 sticky top-[65px] z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg"
    >
      {/* Font and Basic Formatting */}
      <div className="flex items-center gap-1">
        <FontSelector onFontSelect={handleFontChange} currentFont={getCurrentFont()} />
        <div className="w-[1px] h-6 bg-blue-200 dark:bg-blue-700 mx-1" />
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
      </div>

      <div className="w-[1px] h-6 bg-blue-200 dark:bg-blue-700 mx-1" />

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

      <div className="w-[1px] h-6 bg-blue-200 dark:bg-blue-700 mx-1" />

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

      <div className="w-[1px] h-6 bg-blue-200 dark:bg-blue-700 mx-1" />

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

      <div className="w-[1px] h-6 bg-blue-200 dark:bg-blue-700 mx-1" />

      {/* Media & Special */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={handleLink} isActive={editor.isActive("link")} title="Insert Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onVideoClick} isActive={false} title="Insert Video">
          <Play className="w-4 h-4" />
        </ToolbarButton>
        {/* COMMENTED OUT IMAGE UPLOAD
        <ToolbarButton onClick={onImageClick} isActive={false} title="Insert Image">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        */}
        <ToolbarButton
          onClick={handleCodeBlock}
          isActive={editor.isActive("codeBlock")}
          title="Code Block (Ctrl+Alt+C)"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleHorizontalRule} isActive={false} title="Horizontal Rule">
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleClearFormatting} isActive={false} title="Clear Formatting">
          <Eraser className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <motion.div
        className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-medium"
        animate={{
          boxShadow: [
            "0 0 0 0 rgba(59, 130, 246, 0.4)",
            "0 0 0 4px rgba(59, 130, 246, 0.1)",
            "0 0 0 0 rgba(59, 130, 246, 0.4)",
          ],
        }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
      >
        <Sparkles className="w-3 h-3" />
        Premium Editor
      </motion.div>
    </motion.div>
  )
}

// Enhanced Text Format Dropdown
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
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer"
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
            className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-700 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {textFormats.map((format, index) => (
              <motion.button
                key={format.value}
                onClick={() => handleFormatSelect(format)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer"
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

// Enhanced Bubble Menu
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
      className={`p-2 rounded-md transition-all duration-200 cursor-pointer ${
        isActive
          ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shadow-sm"
          : "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
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
      className="flex items-center gap-1 p-2 bg-white/95 dark:bg-zinc-800/95 border border-blue-200 dark:border-blue-700 rounded-xl shadow-xl backdrop-blur-md"
    >
      <TextFormatDropdown editor={editor} />
      <div className="w-[1px] h-6 bg-blue-200 dark:bg-blue-700 mx-1" />
      <BubbleButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </BubbleButton>
      <BubbleButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough (Ctrl+Shift+S)"
      >
        <Strikethrough className="w-4 h-4" />
      </BubbleButton>
      <SimpleColorPicker
        onColorSelect={handleHighlight}
        currentColor={getCurrentHighlightColor()}
        isHighlightAvailable={isHighlightAvailable}
      />
      <div className="w-[1px] h-6 bg-blue-200 dark:bg-blue-700 mx-1" />
      <BubbleButton onClick={handleLink} isActive={editor.isActive("link")} title="Insert Link">
        <LinkIcon className="w-4 h-4" />
      </BubbleButton>
      <div className="w-[1px] h-6 bg-blue-200 dark:bg-blue-700 mx-1" />
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
    </BubbleMenu>
  )
}

// Main Article Editor Component
export function ArticleEditorPremium({ initialArticle }: ArticleEditorProps) {
  const [title, setTitle] = useState(initialArticle.title)
  const [content, setContent] = useState(initialArticle.content_md)
  const [status, setStatus] = useState<SaveStatus>("idle")
  // const [showImageModal, setShowImageModal] = useState(false) // COMMENTED OUT
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showBlockMode, setShowBlockMode] = useState(false)
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([])
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [isHighlightAvailable, setIsHighlightAvailable] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const debouncedTitle = useDebounce(title, 1500)
  const debouncedContent = useDebounce(content, 1500)

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
          class: "text-blue-600 hover:underline dark:text-blue-400 cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-lg shadow-md my-4 max-w-full h-auto",
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
          "[&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:leading-snug",
          "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:leading-snug",
          "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:leading-snug",
          "[&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:leading-snug",
          "[&_h5]:text-base [&_h5]:font-semibold [&_h5]:mt-5 [&_h5]:mb-2 [&_h5]:leading-normal",
          "[&_h6]:text-sm [&_h6]:font-semibold [&_h6]:mt-5 [&_h6]:mb-2 [&_h6]:leading-normal",
          "[&_p]:mb-2 [&_p]:leading-relaxed [&_p]:text-base",
          "[&_ul]:list-disc [&_ul]:list-outside [&_ul]:ml-6 [&_ul]:my-4 [&_ul]:space-y-1.5",
          "[&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-6 [&_ol]:my-4 [&_ol]:space-y-1.5",
          "[&_li]:pl-1 [&_li]:pb-4 [&_li]:leading-relaxed",
          "[&_strong]:font-semibold",
          "[&_em]:italic",
          "[&_blockquote]:relative [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-300 [&_blockquote]:dark:border-blue-700 [&_blockquote]:rounded [&_blockquote]:py-2 [&_blockquote]:px-4",
          "[&_code]:relative [&_code]:rounded [&_code]:bg-blue-100 [&_code]:dark:bg-blue-900/50 [&_code]:px-[0.4rem] [&_code]:py-[0.2rem] [&_code]:font-mono [&_code]:text-[0.9em]",
          "[&_pre]:bg-zinc-900 [&_pre]:text-zinc-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4",
          "[&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0",
          "[&_table]:my-4 [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse",
          "[&_th]:py-2 [&_th]:pr-8 [&_th]:text-left [&_th]:font-normal [&_th]:border-b [&_th]:border-blue-200 [&_th]:dark:border-blue-700",
          "[&_td]:py-2 [&_td]:pr-8 [&_td]:align-top [&_td]:border-b [&_td]:border-blue-200 [&_td]:dark:border-blue-700",
          "[&_.ProseMirror-selectednode]:outline-2 [&&_.ProseMirror-selectednode]:outline-blue-500",
          "[&_ul[data-type='taskList']]:list-none [&_li[data-type='taskItem']]:flex [&_li[data-type='taskItem']]:items-start [&_li[data-type='taskItem']]:gap-2",
          "[&_*[style*='text-align: center']]:text-center",
          "[&_*[style*='text-align: right']]:text-right",
          "[&_*[style*='text-align: justify']]:text-justify",
          "[&_*[style*='text-align: left']]:text-left",
          "[&_a]:text-blue-600 [&_a]:hover:underline [&_a]:dark:text-blue-400 [&_a]:cursor-pointer [&_a]:no-underline [&_a]:hover:underline",
          "[&_img]:rounded-lg [&_img]:shadow-md [&_img]:my-4",
          "[&_hr]:border-blue-200 [&_hr]:dark:border-blue-700 [&_hr]:my-6",
          "[&_mark]:px-1 [&_mark]:py-0.5 [&_mark]:rounded",
          // Video embed styles
          "[&_iframe]:rounded-lg [&_iframe]:shadow-md [&_iframe]:my-4 [&_iframe]:w-full [&_iframe]:aspect-video",
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
      console.log(
        "Loaded extensions:",
        editor.extensionManager.extensions.map((ext) => ext.name),
      )
      const highlightExt = editor.extensionManager.extensions.find((ext) => ext.name === "highlight")
      const available = !!highlightExt
      console.log("Highlight extension loaded:", available)
      setIsHighlightAvailable(available)
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

  // Handle video insertion
  const handleVideoInsert = useCallback(
    async (url: string, platform: string) => {
      if (editor) {
        setIsProcessing(true)
        try {
          // Auto-detect platform if not specified
          const detectedPlatform = platform === "auto" ? VideoProcessor.detectPlatform(url) : platform

          // Process the video URL
          const result = await VideoProcessor.processVideoUrl(url, detectedPlatform)

          if (result) {
            // Insert the processed video embed
            editor.chain().focus().insertContent(result.html).run()
            toast.success(
              `${result.platform.charAt(0).toUpperCase() + result.platform.slice(1)} video inserted successfully!`,
            )
          } else {
            throw new Error("Failed to process video URL")
          }
        } catch (error) {
          console.error("Video insertion error:", error)
          toast.error("Failed to process video link. Please check the URL and try again.")
        } finally {
          setIsProcessing(false)
        }
      }
    },
    [editor],
  )

  // COMMENTED OUT IMAGE INSERTION
  // const handleImageInsert = useCallback(
  //   (url: string, alt?: string) => {
  //     if (editor) {
  //       editor
  //         .chain()
  //         .focus()
  //         .setImage({
  //           src: url,
  //           alt: alt || "",
  //           title: alt || "",
  //         })
  //         .run()

  //       toast.success("Image inserted successfully!")
  //     }
  //   },
  //   [editor],
  // )

  // Convert content to blocks for drag and drop mode
  const convertToBlocks = useCallback(() => {
    if (!editor) return

    const html = editor.getHTML()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    const elements = Array.from(doc.body.children)

    const blocks: ContentBlock[] = elements.map((element, index) => ({
      id: `block-${index}`,
      content: element.outerHTML,
      type: element.tagName.toLowerCase() as "paragraph" | "heading" | "list",
    }))

    setContentBlocks(blocks)
    setShowBlockMode(true)
  }, [editor])

  // Convert blocks back to editor content
  const convertFromBlocks = useCallback(() => {
    if (!editor) return

    const html = contentBlocks.map((block) => block.content).join("")
    editor.commands.setContent(html)
    setShowBlockMode(false)
  }, [editor, contentBlocks])

  // Handle block reordering
  const moveBlock = useCallback((dragIndex: number, hoverIndex: number) => {
    setContentBlocks((prev) => {
      const newBlocks = [...prev]
      const draggedBlock = newBlocks[dragIndex]
      newBlocks.splice(dragIndex, 1)
      newBlocks.splice(hoverIndex, 0, draggedBlock)
      return newBlocks
    })
  }, [])

  // Handle block deletion
  const deleteBlock = useCallback((id: string) => {
    setContentBlocks((prev) => prev.filter((block) => block.id !== id))
  }, [])

  // Handle block editing
  const editBlock = useCallback((id: string, newContent: string) => {
    setContentBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, content: newContent } : block)))
  }, [])

  // Auto-save functionality
  const handleAutoSave = useCallback(async () => {
    if (debouncedContent === initialArticle.content_md && debouncedTitle === initialArticle.title) {
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
        }),
      })
      setStatus("saved")
      setTimeout(() => setStatus("idle"), 2000)
    } catch (error) {
      toast.error("Failed to save changes.")
      setStatus("idle")
    }
  }, [debouncedContent, debouncedTitle, initialArticle])

  useEffect(() => {
    handleAutoSave()
  }, [debouncedContent, debouncedTitle, handleAutoSave])

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

  // Save status indicator
  const SaveStatusIndicator = () => {
    switch (status) {
      case "saving":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"
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
            className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Saved</span>
          </motion.div>
        )
      default:
        return <span className="text-sm text-zinc-500 dark:text-zinc-400">Last edit a few seconds ago</span>
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-blue-900/20 text-zinc-900 dark:text-zinc-50 smooth-scroll"
      >
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-20 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-blue-200 dark:border-blue-800"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm min-w-0 flex-1 mr-4">
              <span className="text-zinc-500 whitespace-nowrap">{initialArticle.author?.firstName ?? "Author"}</span>
              <span className="text-zinc-400">/</span>
              <span
                className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[300px] sm:max-w-[400px] md:max-w-[500px]"
                title={title}
              >
                {title}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <motion.button
                onClick={showBlockMode ? convertFromBlocks : convertToBlocks}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all ${
                  showBlockMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70"
                }`}
              >
                <Layers className="w-4 h-4" />
                {showBlockMode ? "Exit Blocks" : "Block Mode"}
              </motion.button>
              <SaveStatusIndicator />
              <motion.button
                onClick={handlePublish}
                disabled={status === "saving"}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all cursor-pointer shadow-lg"
              >
                Publish
              </motion.button>
            </div>
          </div>
        </motion.header>

        <main className="w-full pt-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Canvas Title"
                className="w-full resize-none border-none focus:outline-none focus:ring-0
                           text-4xl md:text-5xl font-extrabold tracking-tight bg-transparent p-0 cursor-text
                           placeholder:text-zinc-400 dark:placeholder:text-zinc-600 smooth-scroll"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  target.style.height = `${target.scrollHeight}px`
                }}
              />
            </motion.div>

            <AnimatePresence mode="wait">
              {showBlockMode ? (
                <motion.div
                  key="blocks"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Block Mode: Drag and drop to reorder content
                    </span>
                  </div>
                  {contentBlocks.map((block, index) => (
                    <DraggableContentBlock
                      key={block.id}
                      id={block.id}
                      content={block.content}
                      index={index}
                      moveBlock={moveBlock}
                      onDelete={deleteBlock}
                      onEdit={editBlock}
                      isEditing={editingBlockId === block.id}
                      onEditStart={setEditingBlockId}
                      onEditEnd={() => setEditingBlockId(null)}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <EditorToolbar
                    editor={editor}
                    onVideoClick={() => setShowVideoModal(true)}
                    isHighlightAvailable={isHighlightAvailable}
                  />
                  <BubbleMenuBar editor={editor} isHighlightAvailable={isHighlightAvailable} />
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4 editor-content"
                  >
                    <EditorContent editor={editor} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* COMMENTED OUT IMAGE UPLOAD MODAL
        <ImageUploadModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          onImageInsert={handleImageInsert}
        />
        */}

        <VideoLinkModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          onVideoInsert={handleVideoInsert}
        />
      </motion.div>
    </DndProvider>
  )
}
