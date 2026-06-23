// src/components/CountUp.tsx
'use client'
import { useEffect, useState } from 'react'

export function CountUp({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const duration = 2000
    const steps = 60
    const increment = Math.max(0, end) / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= Math.max(0, end)) {
        setCount(Math.max(0, end))
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [end])

  return <span>{count.toLocaleString('vi-VN')}{suffix}</span>
}
