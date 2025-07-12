"use client"

import type React from "react"
import { motion } from "framer-motion"
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  LinkIcon,
  Play,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Eraser,
} from "lucide-react"
import type { Editor } from "@tiptap/react"
import { FontSelector } from "./font-selector"

interface MonochromeToolbarProps {
  editor: Editor | null
  onVideoClick: () => void
  isHighlightAvailable: boolean
}

export function MonochromeToolbar({ editor, onVideoClick, isHighlightAvailable }: MonochromeToolbarProps) {
  if (!editor) return null

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
    disabled = false,
  }: {
    onClick: () => void
    isActive: boolean
    children: React.ReactNode
    title: string
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-2 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )

  const handleLink = () => {
    const url = window.prompt("Enter URL:")
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const handleHighlight = (color: string) => {
    if (!isHighlightAvailable) return
    if (color) {
      editor.chain().focus().setHighlight({ color }).run()
    } else {
      editor.chain().focus().unsetHighlight().run()
    }
  }

  const handleFontChange = (fontFamily: string) => {
    try {
      if (fontFamily) {
        editor.chain().focus().setMark("textStyle", { fontFamily }).run()
      } else {
        editor.chain().focus().unsetMark("textStyle").run()
      }
    } catch (error) {
      console.error("Font change error:", error)
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

  const getCurrentHighlightColor = () => {
    try {
      if (!editor.extensionManager.extensions.find((ext) => ext.name === "highlight")) {
        return ""
      }
      const attributes = editor.getAttributes("highlight")
      return attributes.color || ""
    } catch (error) {
      return ""
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="hidden md:flex items-center gap-1 p-3 mb-6 sticky top-[73px] z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mx-auto w-fit"
    >
      {/* Font Selector */}
      <div className="flex items-center gap-1">
        <FontSelector onFontSelect={handleFontChange} currentFont={getCurrentFont()} />
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />
      </div>

      {/* Basic Formatting */}
      <div className="flex items-center gap-1">
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
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        {isHighlightAvailable && (
          <ToolbarButton
            onClick={() => handleHighlight(getCurrentHighlightColor() ? "" : "#fef08a")}
            isActive={!!getCurrentHighlightColor()}
            title="Highlight"
          >
            <Palette className="w-4 h-4" />
          </ToolbarButton>
        )}
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />
      </div>

      {/* Headings */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />
      </div>

      {/* Lists */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          isActive={editor.isActive({ textAlign: "justify" })}
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />
      </div>

      {/* Media & Special */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={handleLink} isActive={editor.isActive("link")} title="Insert Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onVideoClick} isActive={false} title="Insert Video">
          <Play className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          isActive={false}
          title="Horizontal Rule"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().setParagraph().run()}
          isActive={false}
          title="Clear Formatting"
        >
          <Eraser className="w-4 h-4" />
        </ToolbarButton>
      </div>
    </motion.div>
  )
}
