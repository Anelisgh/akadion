import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatWeeks(count) {
  const n = Number(count) || 0
  return n === 1 ? "1 săptămână" : `${n} săptămâni`
}

export function formatStudents(count) {
  const n = Number(count) || 0
  return n === 1 ? "1 student" : `${n} studenți`
}
