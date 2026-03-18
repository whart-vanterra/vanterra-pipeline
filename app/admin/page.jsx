"use client"
import { useState, useEffect, useCallback } from "react"
import { dealsColumns, nurtureColumns, parseSheetRow, validateDeals, validateNurture } from "../../lib/schema"
import { getDefaultData } from "../../lib/data"

const BLUE = "#185FA5"
const GREEN = "#3B6D11"
const RED = "#A32D2D"
const GRAY_M = "#888780"

export default function AdminPage() {
  const [key, setKey] = useState("")
  const [authed, setAuthed] = useState(false)
  const [inputKey, setInputKey] = useState("")
  const [error, setError] = useState(null)

  const [file, setFile] = useState(null)
  const [parsedDeals, setParsedDeals] = useState(null)
  const [parsedNurture, setParsedNurture] = useState(null)
  const [parseErrors, setParseErrors] = useState([])
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(null)

  const [revisions, setRevisions] = useState([])
  const [rollingBack, setRollingBack] = useState(false)

  const [activeTab, setActiveTab] = useState("upload")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlKey = params.get("key")
    const savedKey = localStorage.getItem("vanterra-pipeline-key")
    const k = urlKey || savedKey
    if (k) {
      checkAuth(k)
    }
  }, [])

  async function checkAuth(k) {
    try {
      const res = await fetch(`/api/auth?key=${encodeURIComponent(k)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.role === "admin") {
          setKey(k)
          setAuthed(true)
          localStorage.setItem("vanterra-pipeline-key", k)
          fetchRevisions(k)
          return
        }
      }
      setError("Admin access required")
    } catch {
      setError("Auth check failed")
    }
  }

  async function fetchRevisions(k) {
    try {
      const res = await fetch("/api/upload", {
        headers: { Authorization: `Bearer ${k}` },
      })
      if (res.ok) {
        const data = await res.json()
        setRevisions(data.revisions || [])
      }
    } catch {
      // ignore
    }
  }

  async function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setParsedDeals(null)
    setParsedNurture(null)
    setParseErrors([])
    setPublished(null)

    try {
      const XLSX = (await import("xlsx")).default
      const buffer = await f.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array" })

      const dealsSheet = wb.Sheets["Deals"] || wb.Sheets["Active Pipeline"] || wb.Sheets[wb.SheetNames[0]]
      const nurtureSheet = wb.Sheets["Nurture"] || wb.Sheets["Nurture Tracker"] || wb.Sheets[wb.SheetNames[1]]

      if (!dealsSheet) {
        setParseErrors(["No 'Deals' sheet found"])
        return
      }

      const dealsRaw = XLSX.utils.sheet_to_json(dealsSheet)
      const nurtureRaw = nurtureSheet ? XLSX.utils.sheet_to_json(nurtureSheet) : []

      const deals = dealsRaw.map((row) => parseSheetRow(row, dealsColumns))
      const nurture = nurtureRaw.map((row) => parseSheetRow(row, nurtureColumns))

      const errors = [...validateDeals(deals).map((e) => `Deals: ${e}`), ...validateNurture(nurture).map((e) => `Nurture: ${e}`)]

      setParsedDeals(deals)
      setParsedNurture(nurture)
      setParseErrors(errors)
    } catch (err) {
      setParseErrors([`Parse error: ${err.message}`])
    }
  }

  async function handlePublish() {
    if (!parsedDeals) return
    setPublishing(true)
    setError(null)

    const defaultData = getDefaultData()
    const payload = {
      deals: parsedDeals,
      nurture: parsedNurture || defaultData.nurture,
      meta: defaultData.meta,
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        setPublished(data.timestamp)
        fetchRevisions(key)
      } else {
        const data = await res.json()
        setError(data.error || "Upload failed")
      }
    } catch (err) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  async function handleRollback(revisionUrl) {
    setRollingBack(true)
    setError(null)
    try {
      const res = await fetch(revisionUrl)
      if (!res.ok) throw new Error("Failed to fetch revision")
      const data = await res.json()

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(data),
      })
      if (uploadRes.ok) {
        setPublished(new Date().toISOString())
        fetchRevisions(key)
      } else {
        const errData = await uploadRes.json()
        setError(errData.error || "Rollback failed")
      }
    } catch (err) {
      setError(`Rollback failed: ${err.message}`)
    } finally {
      setRollingBack(false)
    }
  }

  if (!authed) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
        <form
          onSubmit={(e) => { e.preventDefault(); checkAuth(inputKey.trim()) }}
          style={{ background: "#f8f7f4", borderRadius: 12, padding: 32, width: 360, textAlign: "center" }}
        >
          <div style={{ fontSize: 11, color: GRAY_M, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Vanterra Capital</div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 24px" }}>Admin Access</h1>
          <input
            type="text"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Enter admin key"
            autoFocus
            style={{ width: "100%", padding: "10px 14px", border: "1px solid #d3d1c7", borderRadius: 6, fontSize: 14, marginBottom: 12, fontFamily: "inherit" }}
          />
          {error && <div style={{ color: RED, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button type="submit" style={{ width: "100%", padding: "10px 14px", background: BLUE, color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            Sign In
          </button>
        </form>
      </div>
    )
  }

  const tabStyle = (active) => ({
    padding: "8px 20px",
    border: "none",
    borderBottom: active ? `2px solid ${BLUE}` : "2px solid transparent",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    color: active ? BLUE : GRAY_M,
    marginBottom: -1,
    fontFamily: "inherit",
  })

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: GRAY_M, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Vanterra Capital</div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Pipeline Admin</h1>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <a href="/" style={{ fontSize: 12, color: BLUE, textDecoration: "none", padding: "6px 14px", border: `1px solid ${BLUE}`, borderRadius: 6 }}>Dashboard</a>
          <a href="/template.xlsx" download style={{ fontSize: 12, color: GREEN, textDecoration: "none", padding: "6px 14px", border: `1px solid ${GREEN}`, borderRadius: 6 }}>Download Template</a>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "0.5px solid #e5e3db", marginBottom: 24 }}>
        <button onClick={() => setActiveTab("upload")} style={tabStyle(activeTab === "upload")}>Upload Data</button>
        <button onClick={() => setActiveTab("revisions")} style={tabStyle(activeTab === "revisions")}>Revisions ({revisions.length})</button>
      </div>

      {error && <div style={{ background: "#FCEBEB", color: RED, padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {published && <div style={{ background: "#EAF3DE", color: GREEN, padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>Published successfully at {new Date(published).toLocaleString()}</div>}

      {activeTab === "upload" && (
        <div>
          <div style={{ background: "#f8f7f4", borderRadius: 10, padding: 24, marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Upload spreadsheet (.xlsx, .csv)</label>
            <input
              type="file"
              accept=".xlsx,.csv,.xls"
              onChange={handleFile}
              style={{ fontSize: 13 }}
            />
          </div>

          {parseErrors.length > 0 && (
            <div style={{ background: "#FCEBEB", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: RED, marginBottom: 8 }}>Validation issues:</div>
              {parseErrors.map((e, i) => <div key={i} style={{ fontSize: 12, color: RED, marginBottom: 4 }}>{e}</div>)}
            </div>
          )}

          {parsedDeals && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                Preview: {parsedDeals.length} deals, {parsedNurture?.length || 0} nurture targets
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: GRAY_M, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Deals (first 5)</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {dealsColumns.map((c) => (
                          <th key={c.key} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e3db", color: GRAY_M, fontWeight: 500 }}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedDeals.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderBottom: "0.5px solid #e5e3db" }}>
                          {dealsColumns.map((c) => (
                            <td key={c.key} style={{ padding: "6px 8px" }}>{row[c.key] ?? "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={handlePublish}
                  disabled={publishing || parseErrors.length > 0}
                  style={{
                    padding: "10px 24px",
                    background: parseErrors.length > 0 ? GRAY_M : BLUE,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: parseErrors.length > 0 ? "not-allowed" : "pointer",
                    opacity: publishing ? 0.6 : 1,
                  }}
                >
                  {publishing ? "Publishing..." : "Publish to Dashboard"}
                </button>
                <div style={{ fontSize: 12, color: GRAY_M, alignSelf: "center" }}>
                  {parseErrors.length > 0 ? "Fix validation errors first" : "This will replace the current dashboard data"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "revisions" && (
        <div>
          {revisions.length === 0 ? (
            <div style={{ color: GRAY_M, fontSize: 13, padding: 24, textAlign: "center" }}>No revisions yet. Upload data to create the first revision.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {revisions.map((rev, i) => (
                <div key={rev.pathname} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8f7f4", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(rev.timestamp).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: GRAY_M }}>{(rev.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {i > 0 && (
                      <button
                        onClick={() => handleRollback(rev.url)}
                        disabled={rollingBack}
                        style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${BLUE}`, color: BLUE, borderRadius: 6, fontSize: 12, cursor: "pointer", opacity: rollingBack ? 0.6 : 1 }}
                      >
                        {rollingBack ? "Rolling back..." : "Rollback"}
                      </button>
                    )}
                    {i === 0 && <span style={{ fontSize: 12, color: GREEN, fontWeight: 500, padding: "6px 14px" }}>Current</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
