"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence, type PanInfo } from "framer-motion"
import { GripVertical, Trash2, MoreHorizontal } from "lucide-react"
import { useDrag, useDrop, type DropTargetMonitor } from "react-dnd"

interface DragItem {
  id: string
  index: number
}

interface MobileDraggableBlockProps {
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

export function MobileDraggableBlock({
  id,
  content,
  index,
  moveBlock,
  onDelete,
  onEdit,
  isEditing,
  onEditStart,
  onEditEnd,
}: MobileDraggableBlockProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [editContent, setEditContent] = useState(content)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isLongPress, setIsLongPress] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  // Desktop drag and drop
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

  // Mobile touch handlers
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true)
      setShowDeleteMenu(true)
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, 800) // 800ms for long press
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
    setIsLongPress(false)
  }

  const handlePan = (event: any, info: PanInfo) => {
    setDragOffset(info.offset.x)

    // Swipe to delete (swipe left more than 100px)
    if (info.offset.x < -100) {
      setShowDeleteMenu(true)
    } else {
      setShowDeleteMenu(false)
    }
  }

  const handlePanEnd = (event: any, info: PanInfo) => {
    // If swiped left more than 150px, show delete confirmation
    if (info.offset.x < -150) {
      setShowDeleteMenu(true)
    } else {
      setDragOffset(0)
      setShowDeleteMenu(false)
    }
  }

  const handleSave = () => {
    onEdit(id, editContent)
    onEditEnd()
  }

  const handleCancel = () => {
    setEditContent(content)
    onEditEnd()
  }

  const handleDelete = () => {
    onDelete(id)
    setShowDeleteMenu(false)
  }

  // Combine refs for desktop drag and drop
  drag(drop(ref))

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  return (
    <>
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: isDragging ? 0.5 : 1,
          y: 0,
          x: dragOffset,
          scale: isLongPress ? 0.98 : 1,
        }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`group relative bg-white dark:bg-zinc-800 rounded-lg border-2 transition-all duration-200 ${
          isDragging
            ? "border-zinc-500 shadow-lg"
            : isHovered || showDeleteMenu
              ? "border-zinc-300 dark:border-zinc-600 shadow-md"
              : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        drag={window.innerWidth >= 768 ? false : "x"} // Only allow drag on mobile
        dragConstraints={{ left: -200, right: 0 }}
        data-handler-id={handlerId}
      >
        {/* Desktop drag handle */}
        <AnimatePresence>
          {(isHovered || isDragging) && window.innerWidth >= 768 && (
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

        {/* Mobile delete indicator */}
        <AnimatePresence>
          {showDeleteMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 bg-red-500/10 dark:bg-red-500/20 rounded-lg flex items-center justify-center z-10"
            >
              <motion.button
                onClick={handleDelete}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg"
              >
                Delete Block
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4">
          {isEditing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-3 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-transparent bg-white dark:bg-zinc-700 resize-none"
                rows={4}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-sm"
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

        {/* Mobile gesture hint */}
        <div className="md:hidden absolute bottom-2 right-2 text-xs text-zinc-400">
          <MoreHorizontal className="w-4 h-4" />
        </div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered || showDeleteMenu ? 1 : 0 }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-zinc-500 to-zinc-700 origin-left"
        />
      </motion.div>

      {/* Mobile instructions overlay */}
      <AnimatePresence>
        {isLongPress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 md:hidden"
            onClick={() => {
              setIsLongPress(false)
              setShowDeleteMenu(false)
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-zinc-800 rounded-xl p-6 mx-4 shadow-2xl"
            >
              <h3 className="font-semibold mb-2">Block Actions</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Swipe left to delete, or drag to reorder</p>
              <button
                onClick={() => {
                  setIsLongPress(false)
                  setShowDeleteMenu(false)
                }}
                className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2 rounded-lg"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
