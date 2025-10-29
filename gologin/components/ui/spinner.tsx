// File: @/components/ui/spinner.tsx
"use client"

import { motion } from "framer-motion"
import React from "react"
import { cn } from "@/lib/utils" // optional: if you have a cn() helper for merging classNames

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  color?: string
}

export function Spinner({ size = 24, color = "text-primary", className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <motion.svg
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        style={{ width: size, height: size }}
        className={color}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </motion.svg>
    </div>
  )
}
