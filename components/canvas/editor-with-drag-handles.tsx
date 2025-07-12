"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GripVertical, Trash2 } from "lucide-react"

interface EditorWithDragHandlesProps {
  children: React.ReactNode
  editor: any
}

export const EditorWithDragHandles = ({ children, editor }: EditorWithDragHandlesProps) => {
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)
  const [dragHandlePosition, setDragHandlePosition] = useState({ top: 0, visible: false })
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!editor) return

    const editorElement = editor.view.dom as HTMLElement
    if (!editorElement) return

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Clear any pending hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }

      // Find the closest paragraph, heading, or list item
      const draggableElement = target.closest("p, h1, h2, h3, h4, h5, h6, li, blockquote, pre") as HTMLElement

      if (draggableElement && editorElement.contains(draggableElement)) {
        if (draggableElement !== hoveredElement) {
          // Clear any pending hover timeout
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
          }

          // Set a small delay before showing handles
          hoverTimeoutRef.current = setTimeout(() => {
            setHoveredElement(draggableElement)
            const rect = draggableElement.getBoundingClientRect()
            const editorRect = editorElement.getBoundingClientRect()

            setDragHandlePosition({
              top: rect.top - editorRect.top + draggableElement.offsetTop,
              visible: true,
            })
          }, 150) // 150ms delay before showing
        }
      } else {
        // Set a longer delay before hiding handles
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current)
        }

        hideTimeoutRef.current = setTimeout(() => {
          setHoveredElement(null)
          setDragHandlePosition((prev) => ({ ...prev, visible: false }))
        }, 300) // 300ms delay before hiding
      }
    }

    const handleMouseLeave = () => {
      // Clear any pending timeouts
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }

      // Set a delay before hiding
      hideTimeoutRef.current = setTimeout(() => {
        setHoveredElement(null)
        setDragHandlePosition((prev) => ({ ...prev, visible: false }))
      }, 500) // 500ms delay when leaving editor
    }

    editorElement.addEventListener("mousemove", handleMouseMove)
    editorElement.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      editorElement.removeEventListener("mousemove", handleMouseMove)
      editorElement.removeEventListener("mouseleave", handleMouseLeave)

      // Clean up timeouts
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [editor, hoveredElement])

  const handleDelete = () => {
    if (!hoveredElement || !editor) return

    try {
      // Find the position of the element in the editor
      const pos = editor.view.posAtDOM(hoveredElement, 0)

      // Check if position is valid
      if (pos === null || pos === undefined || pos < 0) {
        console.warn("Could not find valid position for element deletion")
        return
      }

      // Ensure position is within document bounds
      const docSize = editor.state.doc.content.size
      if (pos >= docSize) {
        console.warn("Position out of document bounds")
        return
      }

      // Try to resolve the position
      const $pos = editor.state.doc.resolve(pos)

      // Find the node boundaries more safely
      let nodeStart = pos
      let nodeEnd = pos

      // Try to find the start and end of the current node
      try {
        // For block nodes, get the full block range
        if ($pos.parent && $pos.parent.type.isBlock) {
          nodeStart = $pos.start($pos.depth)
          nodeEnd = $pos.end($pos.depth)
        } else {
          // For inline content, try to select the whole line/paragraph
          const startOfLine = $pos.start($pos.depth - 1)
          const endOfLine = $pos.end($pos.depth - 1)
          nodeStart = startOfLine
          nodeEnd = endOfLine
        }
      } catch (error) {
        console.warn("Could not determine node boundaries, using position range")
        // Fallback: try to delete just around the current position
        nodeStart = Math.max(0, pos - 1)
        nodeEnd = Math.min(docSize, pos + 1)
      }

      // Ensure the range is valid
      if (nodeStart >= nodeEnd || nodeStart < 0 || nodeEnd > docSize) {
        console.warn("Invalid deletion range")
        return
      }

      // Perform the deletion
      editor.chain().focus().deleteRange({ from: nodeStart, to: nodeEnd }).run()

      // Clear the hovered element
      setHoveredElement(null)
      setDragHandlePosition((prev) => ({ ...prev, visible: false }))
    } catch (error) {
      console.error("Error deleting element:", error)
      // Fallback: try to delete the current selection or do nothing
      try {
        if (editor.state.selection && !editor.state.selection.empty) {
          editor.chain().focus().deleteSelection().run()
        }
      } catch (fallbackError) {
        console.error("Fallback deletion also failed:", fallbackError)
      }
    }
  }

  return (
    <div className="relative">
      {children}

      <AnimatePresence>
        {dragHandlePosition.visible && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute -left-12 flex flex-col gap-1 z-10"
            style={{ top: dragHandlePosition.top }}
          >
            <button
              className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing hover:border-blue-500/50 dark:hover:border-blue-400/50"
              title="Drag to reorder"
              onMouseDown={(e) => {
                // Implement drag functionality here
                e.preventDefault()
              }}
            >
              <GripVertical className="w-3.5 h-3.5 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete block"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
