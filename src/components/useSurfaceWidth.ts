import { useEffect, useRef, useState } from 'react'

/** Observe the actual panel, including when a closed disclosure becomes visible. */
export default function useSurfaceWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 320, fontSize: 16 })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width <= 0) return
      const next = { width: Math.floor(entry.contentRect.width), fontSize: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 }
      setSize(current => current.width === next.width && current.fontSize === next.fontSize ? current : next)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, ...size }
}
