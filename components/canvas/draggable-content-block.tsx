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
      className={`group relative rounded-lg border-2 transition-all duration-200  ${
        isDragging
          ? "bg-zinc-50"
          : isHovered
            ? "border-zinc-200"
            : "border-zinc-200 border-[1px] bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700"
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
              className="p-1 bg-zinc-50 border border-zinc-600 rounded shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4 text-zinc-400 hover:text-blue-500 transition-colors" />
            </button>
            <button
              onClick={() => onDelete(id)}
              className="p-1 bg-red-500 border border-zinc-600 rounded hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-400 transition-all duration-200"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4 text-white hover:text-red-400 transition-colors" />
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
              className="w-full p-4 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 resize-none transition-all duration-200 shadow-sm hover:shadow-md font-mono text-sm leading-relaxed"
              rows={4}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium shadow-sm hover:shadow-md"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 cursor-pointer border border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300 rounded-lg transition-all duration-200 text-sm shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <div
            className="prose prose-sm prose-invert max-w-none cursor-pointer hover:prose-headings:text-blue-400 transition-colors duration-200"
            onClick={() => onEditStart(id)}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isHovered ? 1 : 0 }}
        className="absolute bottom-0 left-0 right-0 h-0.5 origin-left"
      />
    </motion.div>
  )
}
