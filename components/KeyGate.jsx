"use client"
import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "vanterra-pipeline-key"

export default function KeyGate({ children }) {
  const [key, setKey] = useState("")
  const [inputKey, setInputKey] = useState("")
  const [role, setRole] = useState(null)
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(true)

  const validateKey = useCallback(async (k) => {
    if (!k) {
      setChecking(false)
      return
    }
    setChecking(true)
    setError(null)
    try {
      const res = await fetch(`/api/auth?key=${encodeURIComponent(k)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.role) {
          setKey(k)
          setRole(data.role)
          localStorage.setItem(STORAGE_KEY, k)
          setChecking(false)
          return
        }
      }
      localStorage.removeItem(STORAGE_KEY)
      setError("Invalid access key")
      setRole(null)
    } catch {
      setError("Failed to validate key")
    }
    setChecking(false)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlKey = params.get("key")
    const savedKey = localStorage.getItem(STORAGE_KEY)
    const keyToUse = urlKey || savedKey
    if (keyToUse) {
      validateKey(keyToUse)
    } else {
      setChecking(false)
    }
  }, [validateKey])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputKey.trim()) {
      validateKey(inputKey.trim())
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setKey("")
    setRole(null)
    setInputKey("")
  }

  if (checking) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
        <div style={{ color: "#888780", fontSize: 14 }}>Verifying access...</div>
      </div>
    )
  }

  if (!role) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
        <form onSubmit={handleSubmit} style={{ background: "#f8f7f4", borderRadius: 12, padding: 32, width: 360, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#888780", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Vanterra Capital</div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 24px" }}>M&A Pipeline</h1>
          <input
            type="text"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Enter access key"
            autoFocus
            style={{ width: "100%", padding: "10px 14px", border: "1px solid #d3d1c7", borderRadius: 6, fontSize: 14, marginBottom: 12, fontFamily: "inherit", outline: "none" }}
          />
          {error && <div style={{ color: "#A32D2D", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            style={{ width: "100%", padding: "10px 14px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            Access Dashboard
          </button>
        </form>
      </div>
    )
  }

  return children({ role, key, onLogout: handleLogout })
}
