"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Type, ChevronDown } from "lucide-react"

interface FontSelectorProps {
  onFontSelect: (font: string) => void
  currentFont?: string
}

const fontFamilies = [
  { name: "Default", value: "", class: "font-sans" },
  { name: "Inter", value: "Inter, sans-serif", class: "font-sans" },
  { name: "Roboto", value: "Roboto, sans-serif", class: "font-sans" },
  { name: "Open Sans", value: "'Open Sans', sans-serif", class: "font-sans" },
  { name: "Lato", value: "Lato, sans-serif", class: "font-sans" },
  { name: "Montserrat", value: "Montserrat, sans-serif", class: "font-sans" },
  { name: "Poppins", value: "Poppins, sans-serif", class: "font-sans" },
  { name: "Source Sans Pro", value: "'Source Sans Pro', sans-serif", class: "font-sans" },
  { name: "Nunito", value: "Nunito, sans-serif", class: "font-sans" },
  { name: "Playfair Display", value: "'Playfair Display', serif", class: "font-serif" },
  { name: "Merriweather", value: "Merriweather, serif", class: "font-serif" },
  { name: "Lora", value: "Lora, serif", class: "font-serif" },
  { name: "Crimson Text", value: "'Crimson Text', serif", class: "font-serif" },
  { name: "PT Serif", value: "'PT Serif', serif", class: "font-serif" },
  { name: "JetBrains Mono", value: "'JetBrains Mono', monospace", class: "font-mono" },
  { name: "Fira Code", value: "'Fira Code', monospace", class: "font-mono" },
  { name: "Source Code Pro", value: "'Source Code Pro', monospace", class: "font-mono" },
  { name: "Roboto Mono", value: "'Roboto Mono', monospace", class: "font-mono" },
]

export function FontSelector({ onFontSelect, currentFont }: FontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentFontObj = fontFamilies.find((font) => font.value === currentFont) || fontFamilies[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleFontSelect = (font: string) => {
    onFontSelect(font)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Font Family"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
      >
        <Type className="w-4 h-4" />
        <span className="hidden sm:inline" style={{ fontFamily: currentFontObj.value || "inherit" }}>
          {currentFontObj.name}
        </span>
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
            className="absolute top-full left-0 mt-2 w-56 max-h-64 overflow-y-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50"
          >
            {fontFamilies.map((font, index) => (
              <motion.button
                key={font.value || "default"}
                onClick={() => handleFontSelect(font.value)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm text-left transition-all cursor-pointer ${
                  currentFont === font.value
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                style={{ fontFamily: font.value || "inherit" }}
              >
                <span>{font.name}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
