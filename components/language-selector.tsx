"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Code } from 'lucide-react'

interface LanguageSelectorProps {
  onLanguageSelect: (language: string) => void
  currentLanguage?: string
}

const languages = [
  { name: "Auto", value: "auto" },
  { name: "JavaScript", value: "javascript" },
  { name: "TypeScript", value: "typescript" },
  { name: "Python", value: "python" },
  { name: "Java", value: "java" },
  { name: "C++", value: "cpp" },
  { name: "C#", value: "csharp" },
  { name: "PHP", value: "php" },
  { name: "Ruby", value: "ruby" },
  { name: "Go", value: "go" },
  { name: "Rust", value: "rust" },
  { name: "HTML", value: "html" },
  { name: "CSS", value: "css" },
  { name: "SQL", value: "sql" },
  { name: "JSON", value: "json" },
  { name: "XML", value: "xml" },
  { name: "Markdown", value: "markdown" },
  { name: "Bash", value: "bash" },
  { name: "PowerShell", value: "powershell" },
  { name: "YAML", value: "yaml" },
]

export function LanguageSelector({ onLanguageSelect, currentLanguage = "auto" }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLang = languages.find((lang) => lang.value === currentLanguage) || languages[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLanguageSelect = (language: string) => {
    onLanguageSelect(language)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Select Language"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer"
      >
        <Code className="w-4 h-4" />
        <span>{currentLang.name}</span>
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
            className="absolute top-full left-0 mt-2 w-48 max-h-64 overflow-y-auto bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-700 rounded-xl shadow-xl z-50"
          >
            {languages.map((language, index) => (
              <motion.button
                key={language.value}
                onClick={() => handleLanguageSelect(language.value)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex items-center gap-3 w-full px-4 py-2 text-sm text-left transition-all cursor-pointer ${
                  currentLanguage === language.value
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                <span>{language.name}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
