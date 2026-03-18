"use client"
import { useState, useEffect } from "react"

export function useData(key) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!key) return

    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/data", {
          headers: { Authorization: `Bearer ${key}` },
        })
        if (!res.ok) {
          throw new Error(`Failed to load data: ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) {
          setData(json)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [key])

  return { data, loading, error, refetch: () => setData(null) }
}
