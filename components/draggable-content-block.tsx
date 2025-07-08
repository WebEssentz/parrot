"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GripVertical, Trash2 } from "lucide-react"
import { useDrag, useDrop, type DropTargetMonitor } from "react-dnd"

interface DragItem {
  id: string
  index: number
}

interface DraggableContentBlockProps {
  id: string
  content: string
  index: number
  moveBlock: (dragIndex: number, hoverIndex: number) => void
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => void
  isEditing: boolean
  onEditStart: (id: string) => void
  onEditEnd: () => void
}

export function DraggableContentBlock({
  id,
  content,
  index,
  moveBlock,
  onDelete,
  onEdit,
  isEditing,
  onEditStart,
  onEditEnd,
}: DraggableContentBlockProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [editContent, setEditContent] = useState(content)
  const ref = useRef<HTMLDivElement>(null)

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: string | symbol | null }>({
    accept: "content-block",
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      }
    },
    hover(item: DragItem, monitor: DropTargetMonitor) {
      if (!ref.current) return

      const dragIndex = item.index
      const hoverIndex = index

      if (dragIndex === hoverIndex) return

      const hoverBoundingRect = ref.current?.getBoundingClientRect()
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return

      moveBlock(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
  })

  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: "content-block",
    item: () => ({ id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const handleSave = () => {
    onEdit(id, editContent)
    onEditEnd()
  }

  const handleCancel = () => {
    setEditContent(content)
    onEditEnd()
  }

  drag(drop(ref))

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`group relative bg-white dark:bg-zinc-800 rounded-lg border-2 transition-all duration-200 ${
        isDragging
          ? "border-blue-500 shadow-lg"
          : isHovered
            ? "border-blue-300 dark:border-blue-600 shadow-md"
            : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-handler-id={handlerId}
    >
      <AnimatePresence>
        {(isHovered || isDragging) && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute -left-8 top-1/2 transform -translate-y-1/2 flex flex-col gap-1"
          >
            <button
              className="p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4 text-zinc-400" />
            </button>
            <button
              onClick={() => onDelete(id)}
              className="p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4">
        {isEditing ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-700 resize-none"
              rows={4}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none cursor-pointer"
            onClick={() => onEditStart(id)}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isHovered ? 1 : 0 }}
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 origin-left"
      />
    </motion.div>
  )
}
