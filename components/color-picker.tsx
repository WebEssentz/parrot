"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Palette, ChevronDown } from "lucide-react"

interface SimpleColorPickerProps {
  onColorSelect: (color: string) => void
  currentColor?: string
  isHighlightAvailable: boolean
}

const highlightColors = [
  { name: "Remove Highlight", value: "", class: "bg-white border-2 border-gray-300", textColor: "#374151" },
  { name: "Yellow", value: "#fef08a", class: "bg-yellow-200", textColor: "#92400e" },
  { name: "Green", value: "#bbf7d0", class: "bg-green-200", textColor: "#065f46" },
  { name: "Blue", value: "#bfdbfe", class: "bg-blue-200", textColor: "#1e40af" },
  { name: "Purple", value: "#e9d5ff", class: "bg-purple-200", textColor: "#7c3aed" },
  { name: "Pink", value: "#fbcfe8", class: "bg-pink-200", textColor: "#be185d" },
  { name: "Orange", value: "#fed7aa", class: "bg-orange-200", textColor: "#c2410c" },
  { name: "Red", value: "#fecaca", class: "bg-red-200", textColor: "#dc2626" },
  { name: "Gray", value: "#e5e7eb", class: "bg-gray-200", textColor: "#374151" },
]

export function SimpleColorPicker({ onColorSelect, currentColor, isHighlightAvailable }: SimpleColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentColorObj = highlightColors.find((color) => color.value === currentColor) || highlightColors[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleColorSelect = (color: string) => {
    onColorSelect(color)
    setIsOpen(false)
  }

  // Don't render if highlight is not available
  if (!isHighlightAvailable) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Highlight Color"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all cursor-pointer ${
          currentColor
            ? `bg-[${currentColor}] dark:bg-[${currentColor}]`
            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }`}
        style={currentColor ? { backgroundColor: currentColor, color: currentColorObj.textColor } : {}}
      >
        <div className="relative">
          <Palette className="w-4 h-4" />
          {currentColor && (
            <div
              className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-white"
              style={{ backgroundColor: currentColor }}
            />
          )}
        </div>
        <span className="hidden sm:inline">{currentColorObj.name}</span>
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
            className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#1E1E1E]/95 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {highlightColors.map((color, index) => (
              <motion.button
                key={color.value || "none"}
                onClick={() => handleColorSelect(color.value)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm text-left transition-all cursor-pointer ${
                  currentColor === color.value
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border ${color.class} flex-shrink-0`}
                  style={{ backgroundColor: color.value || "transparent" }}
                >
                  {!color.value && (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                      ×
                    </div>
                  )}
                </div>
                <span>{color.name}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
