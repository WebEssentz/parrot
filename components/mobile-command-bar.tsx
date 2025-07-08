"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  LinkIcon,
  Play,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  X,
} from "lucide-react"
import type { Editor } from "@tiptap/react"

interface MobileCommandBarProps {
  editor: Editor | null
  showBlockMode: boolean
  onModeToggle: () => void
  onVideoClick: () => void
  isHighlightAvailable: boolean
}

export function MobileCommandBar({
  editor,
  showBlockMode,
  onModeToggle,
  onVideoClick,
  isHighlightAvailable,
}: MobileCommandBarProps) {
  const [showMenu, setShowMenu] = useState(false)

  if (!editor) return null

  const handleAction = (action: () => void) => {
    action()
    setShowMenu(false)
  }

  const handleLink = () => {
    const url = window.prompt("Enter URL:")
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
    setShowMenu(false)
  }

  const handleHighlight = (color: string) => {
    if (!isHighlightAvailable) return
    if (color) {
      editor.chain().focus().setHighlight({ color }).run()
    } else {
      editor.chain().focus().unsetHighlight().run()
    }
    setShowMenu(false)
  }

  const formatActions = [
    { icon: Bold, label: "Bold", action: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: "Italic", action: () => editor.chain().focus().toggleItalic().run() },
    { icon: Strikethrough, label: "Strikethrough", action: () => editor.chain().focus().toggleStrike().run() },
    { icon: Heading1, label: "Heading 1", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { icon: Heading2, label: "Heading 2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, label: "Heading 3", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { icon: List, label: "Bullet List", action: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, label: "Numbered List", action: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: Quote, label: "Quote", action: () => editor.chain().focus().toggleBlockquote().run() },
    { icon: Code, label: "Code Block", action: () => editor.chain().focus().toggleCodeBlock().run() },
    { icon: LinkIcon, label: "Link", action: handleLink },
    { icon: Play, label: "Video", action: onVideoClick },
    { icon: AlignLeft, label: "Align Left", action: () => editor.chain().focus().setTextAlign("left").run() },
    { icon: AlignCenter, label: "Align Center", action: () => editor.chain().focus().setTextAlign("center").run() },
    { icon: AlignRight, label: "Align Right", action: () => editor.chain().focus().setTextAlign("right").run() },
    { icon: AlignJustify, label: "Justify", action: () => editor.chain().focus().setTextAlign("justify").run() },
    { icon: Minus, label: "Divider", action: () => editor.chain().focus().setHorizontalRule().run() },
  ]

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setShowMenu(false)}
          />
        )}
      </AnimatePresence>

      {/* Command Menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-20 left-4 right-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 md:hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Format</h3>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {formatActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action.action)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  >
                    <action.icon className="w-5 h-5" />
                    <span className="text-xs">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-4 left-4 right-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 z-30 md:hidden"
      >
        <div className="flex items-center justify-between p-3">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
          >
            <Plus className="w-5 h-5" />
          </button>

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
            <button
              onClick={onModeToggle}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !showBlockMode
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Write
            </button>
            <button
              onClick={onModeToggle}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showBlockMode
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Arrange
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 disabled:opacity-50"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 disabled:opacity-50"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
