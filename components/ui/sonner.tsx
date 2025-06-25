"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  // Set toast background: white in dark, grayish in light
  const normalBg = theme === "dark"
    ? "#fff"
    : "#f3f4f6"; // Tailwind gray-100
  // Set toast text color: black in dark, gray in light for contrast
  const normalText = theme === "dark"
    ? "#000"
    : "fff" // or use a Tailwind gray like #6b7280 for a lighter gray

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": normalBg,
          "--normal-text": normalText,
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
