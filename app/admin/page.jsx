"use client"
import { useState, useEffect } from "react"
import { getDefaultData } from "../../lib/data"
import { generateAlerts } from "../../lib/alerts"

const BLUE = "#185FA5"
const GREEN = "#3B6D11"
const RED = "#A32D2D"
const GRAY_M = "#888780"
const AMBER = "#854F0B"

export default function AdminPage() {
  const [key, setKey] = useState("")
  const [authed, setAuthed] = useState(false)
  const [inputKey, setInputKey] = useState("")
  const [error, setError] = useState(null)

  const [file, setFile] = useState(null)
  const [parseResult, setParseResult] = useState(null)
  const [publishLabel, setPublishLabel] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(null)

  const [revisions, setRevisions] = useState([])
  const [activeRevision, setActiveRevision] = useState(null)
  const [rollingBack, setRollingBack] = useState(false)
  const [editingLabel, setEditingLabel] = useState(null)
  const [editLabelValue, setEditLabelValue] = useState("")
  const [deleting, setDeleting] = useState(null)

  const [activeTab, setActiveTab] = useState("upload")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlKey = params.get("key")
    const savedKey = localStorage.getItem("vanterra-pipeline-key")
    const k = urlKey || savedKey
    if (k) checkAuth(k)
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
        setActiveRevision(data.activeRevision || null)
      }
    } catch { /* ignore */ }
  }

  async function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setParseResult(null)
    setPublished(null)
    setError(null)

    try {
      const xlsxModule = await import("xlsx")
      const XLSX = xlsxModule.default || xlsxModule
      const { parseSpreadsheet } = await import("../../lib/schema")
      const buffer = await f.arrayBuffer()
      const result = parseSpreadsheet(XLSX, buffer)
      setParseResult(result)
    } catch (err) {
      setParseResult({ data: null, errors: [`Parse error: ${err.message}`], summary: null })
    }
  }

  async function handlePublish() {
    if (!parseResult?.data) return
    setPublishing(true)
    setError(null)

    // Merge parsed data with defaults for any missing fields
    const defaults = getDefaultData()
    const mergedMeta = {
      ...defaults.meta,
      ...parseResult.data.meta,
      budgetData: parseResult.data.meta.budgetData || defaults.meta.budgetData,
      ntm: parseResult.data.meta.ntm || defaults.meta.ntm,
      scorecardVol: parseResult.data.meta.scorecardVol || defaults.meta.scorecardVol,
      scorecardRev: parseResult.data.meta.scorecardRev || defaults.meta.scorecardRev,
    }
    const fullData = { deals: parseResult.data.deals, nurture: parseResult.data.nurture, meta: mergedMeta }

    // Auto-generate committee attention items from the data
    mergedMeta.alerts = generateAlerts(fullData)

    const payload = fullData

    payload.label = publishLabel || `Upload ${new Date().toLocaleDateString()}`

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        setPublished(data.timestamp)
        setPublishLabel("")
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

  async function handleRollback(pathname) {
    setRollingBack(true)
    setError(null)
    try {
      const res = await fetch(`/api/upload?fetch=${encodeURIComponent(pathname)}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) throw new Error("Failed to fetch revision")
      const envelope = await res.json()
      // Envelope format: { data, label, timestamp } — extract data
      const revData = envelope.data || envelope
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ ...revData, restoreOnly: true, activePathname: pathname }),
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

  async function handleDelete(pathname) {
    if (!confirm("Delete this revision? This cannot be undone.")) return
    setDeleting(pathname)
    setError(null)
    try {
      const res = await fetch(`/api/upload?pathname=${encodeURIComponent(pathname)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${key}` },
      })
      if (res.ok) {
        fetchRevisions(key)
      } else {
        const data = await res.json()
        setError(data.error || "Delete failed")
      }
    } catch (err) {
      setError(`Delete failed: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  async function handleUpdateLabel(pathname) {
    setError(null)
    try {
      const res = await fetch(`/api/upload?fetch=${encodeURIComponent(pathname)}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) throw new Error("Failed to fetch revision")
      const envelope = await res.json()
      const revData = envelope.data || envelope
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ ...revData, label: editLabelValue, replaceRevision: pathname }),
      })
      if (uploadRes.ok) {
        setEditingLabel(null)
        fetchRevisions(key)
      } else {
        const data = await uploadRes.json()
        setError(data.error || "Label update failed")
      }
    } catch (err) {
      setError(`Label update failed: ${err.message}`)
    }
  }

  if (!authed) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
        <form
          onSubmit={(e) => { e.preventDefault(); checkAuth(inputKey.trim()) }}
          style={{ background: "#f8f7f4", borderRadius: 12, padding: 32, width: 360, textAlign: "center" }}
        >
          <div style={{ fontSize: 11, color: GRAY_M, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Vanterra Foundations</div>
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

  const hasErrors = parseResult?.errors?.some((e) => !e.startsWith("Warning:"))
  const warnings = parseResult?.errors?.filter((e) => e.startsWith("Warning:")) || []
  const hardErrors = parseResult?.errors?.filter((e) => !e.startsWith("Warning:")) || []

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: GRAY_M, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Vanterra Foundations</div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Pipeline Admin</h1>
        </div>
        <a href="/" style={{ fontSize: 12, color: BLUE, textDecoration: "none", padding: "6px 14px", border: `1px solid ${BLUE}`, borderRadius: 6 }}>Dashboard</a>
      </div>

      <div style={{ display: "flex", borderBottom: "0.5px solid #e5e3db", marginBottom: 24 }}>
        <button onClick={() => setActiveTab("upload")} style={tabStyle(activeTab === "upload")}>Upload Spreadsheet</button>
        <button onClick={() => setActiveTab("revisions")} style={tabStyle(activeTab === "revisions")}>Revisions ({revisions.length})</button>
      </div>

      {error && <div style={{ background: "#FCEBEB", color: RED, padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {published && <div style={{ background: "#EAF3DE", color: GREEN, padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>Published successfully at {new Date(published).toLocaleString()}</div>}

      {activeTab === "upload" && (
        <div>
          <div style={{ background: "#f8f7f4", borderRadius: 10, padding: 24, marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Upload Vanterra Pipeline spreadsheet</label>
            <div style={{ fontSize: 12, color: GRAY_M, marginBottom: 12 }}>
              Upload the working pipeline .xlsx file directly — the parser reads Pipeline Detail, KPIs, NTM Forecast, Budget, and Active Deals sheets.
            </div>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ fontSize: 13 }} />
          </div>

          {hardErrors.length > 0 && (
            <div style={{ background: "#FCEBEB", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: RED, marginBottom: 8 }}>Errors:</div>
              {hardErrors.map((e, i) => <div key={i} style={{ fontSize: 12, color: RED, marginBottom: 4 }}>{e}</div>)}
            </div>
          )}

          {warnings.length > 0 && (
            <div style={{ background: "#FAEEDA", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: AMBER, marginBottom: 8 }}>Warnings (defaults will be used):</div>
              {warnings.map((e, i) => <div key={i} style={{ fontSize: 12, color: AMBER, marginBottom: 4 }}>{e}</div>)}
            </div>
          )}

          {parseResult?.summary && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Parse summary</div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                {[
                  { label: "Active Deals", value: parseResult.summary.deals, color: BLUE },
                  { label: "Nurture Targets", value: parseResult.summary.nurture, color: GREEN },
                  { label: "NTM Entries", value: parseResult.summary.ntm, color: BLUE },
                  { label: "KPI Volume Rows", value: parseResult.summary.scorecardVol },
                  { label: "KPI Revenue Rows", value: parseResult.summary.scorecardRev },
                  { label: "Budget Months", value: parseResult.summary.budgetMonths },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#f8f7f4", borderRadius: 8, padding: "10px 16px", minWidth: 100 }}>
                    <div style={{ fontSize: 11, color: GRAY_M, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: s.color || "var(--color-text-primary)" }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, color: GRAY_M, marginBottom: 12 }}>
                Sheets found: {parseResult.summary.sheets.join(", ")}
              </div>

              {parseResult.data && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 500, color: GRAY_M, textTransform: "uppercase", marginBottom: 8 }}>Active Deals Preview</div>
                  <div style={{ overflowX: "auto", marginBottom: 20 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {["Company", "Stage", "State", "Revenue", "Days", "Health", "Status"].map((h) => (
                            <th key={h} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e3db", color: GRAY_M, fontWeight: 500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.data.deals.slice(0, 8).map((d, i) => (
                          <tr key={i} style={{ borderBottom: "0.5px solid #e5e3db" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 500 }}>{d.company}</td>
                            <td style={{ padding: "6px 8px" }}>{d.stage}</td>
                            <td style={{ padding: "6px 8px" }}>{d.state}</td>
                            <td style={{ padding: "6px 8px" }}>{d.rev ? `$${d.rev}M` : "—"}</td>
                            <td style={{ padding: "6px 8px" }}>{d.days ?? "—"}</td>
                            <td style={{ padding: "6px 8px", color: d.health === "on-track" ? GREEN : d.health === "at-risk" ? RED : AMBER }}>{d.health}</td>
                            <td style={{ padding: "6px 8px", color: GRAY_M, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parseResult.data.deals.length > 8 && (
                      <div style={{ fontSize: 12, color: GRAY_M, padding: "8px 0" }}>... and {parseResult.data.deals.length - 8} more deals</div>
                    )}
                  </div>

                  {parseResult.data.meta?.kpis && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 500, color: GRAY_M, textTransform: "uppercase", marginBottom: 8 }}>Computed KPIs</div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                        {[
                          { label: "Acquired", value: parseResult.data.meta.kpis.acquired },
                          { label: "Under LOI", value: parseResult.data.meta.kpis.underLoi },
                          { label: "Projected", value: parseResult.data.meta.kpis.projected },
                          { label: "Full Year Budget", value: parseResult.data.meta.kpis.fullYear },
                          { label: "Active Pipeline", value: parseResult.data.meta.kpis.activePipeline },
                        ].map((k) => (
                          <div key={k.label} style={{ background: "#f8f7f4", borderRadius: 8, padding: "8px 14px" }}>
                            <div style={{ fontSize: 11, color: GRAY_M }}>{k.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 500 }}>{k.value}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {parseResult.data && (() => {
                const defaults = getDefaultData()
                const previewMeta = {
                  ...defaults.meta,
                  ...parseResult.data.meta,
                  budgetData: parseResult.data.meta.budgetData || defaults.meta.budgetData,
                  scorecardVol: parseResult.data.meta.scorecardVol || defaults.meta.scorecardVol,
                  scorecardRev: parseResult.data.meta.scorecardRev || defaults.meta.scorecardRev,
                }
                const previewAlerts = generateAlerts({ deals: parseResult.data.deals, nurture: parseResult.data.nurture, meta: previewMeta })
                const alertColors = { pos: { bg: "#EAF3DE", fg: "#27500A", dot: GREEN }, warn: { bg: "#FAEEDA", fg: "#633806", dot: AMBER }, neutral: { bg: "#f8f7f4", fg: "#444441", dot: GRAY_M } }
                return previewAlerts.length > 0 ? (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: GRAY_M, textTransform: "uppercase", marginBottom: 8 }}>Auto-generated Committee Alerts</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {previewAlerts.map((a, i) => {
                        const c = alertColors[a.type] || alertColors.neutral
                        return (
                          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: c.bg, borderRadius: 6, padding: "8px 12px" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, marginTop: 5, flexShrink: 0 }} />
                            <div style={{ fontSize: 12, color: c.fg, lineHeight: 1.5 }}>{a.text}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null
              })()}

              <div style={{ marginTop: 16, marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: GRAY_M, display: "block", marginBottom: 6 }}>Revision label (optional)</label>
                <input
                  type="text"
                  value={publishLabel}
                  onChange={(e) => setPublishLabel(e.target.value)}
                  placeholder="e.g. March weekly update, Fixed Boccia revenue"
                  style={{ width: "100%", maxWidth: 400, padding: "8px 12px", border: "1px solid #d3d1c7", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}
                />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  onClick={handlePublish}
                  disabled={publishing || hasErrors || !parseResult.data}
                  style={{
                    padding: "10px 24px",
                    background: (hasErrors || !parseResult.data) ? GRAY_M : BLUE,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: (hasErrors || !parseResult.data) ? "not-allowed" : "pointer",
                    opacity: publishing ? 0.6 : 1,
                  }}
                >
                  {publishing ? "Publishing..." : "Publish to Dashboard"}
                </button>
                <div style={{ fontSize: 12, color: GRAY_M, alignSelf: "center" }}>
                  {hasErrors ? "Fix errors first" : warnings.length > 0 ? "Missing sheets will use existing defaults" : "This will replace the current dashboard data"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "revisions" && (
        <div>
          {revisions.length === 0 ? (
            <div style={{ color: GRAY_M, fontSize: 13, padding: 24, textAlign: "center" }}>No revisions yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {revisions.map((rev, i) => (
                <div key={rev.pathname} style={{ padding: "12px 16px", background: "#f8f7f4", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{new Date(rev.timestamp).toLocaleString()}</span>
                        {(activeRevision ? rev.pathname === activeRevision : i === 0) && <span style={{ fontSize: 11, color: GREEN, fontWeight: 500, background: "#EAF3DE", padding: "2px 8px", borderRadius: 4 }}>Live</span>}
                        <span style={{ fontSize: 12, color: GRAY_M }}>{(rev.size / 1024).toFixed(1)} KB</span>
                      </div>
                      {editingLabel === rev.pathname ? (
                        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                          <input
                            type="text"
                            value={editLabelValue}
                            onChange={(e) => setEditLabelValue(e.target.value)}
                            placeholder="Enter label"
                            autoFocus
                            style={{ flex: 1, maxWidth: 300, padding: "4px 8px", border: "1px solid #d3d1c7", borderRadius: 4, fontSize: 12, fontFamily: "inherit" }}
                            onKeyDown={(e) => { if (e.key === "Enter") handleUpdateLabel(rev.url, rev.pathname); if (e.key === "Escape") setEditingLabel(null) }}
                          />
                          <button onClick={() => handleUpdateLabel(rev.pathname)} style={{ padding: "4px 10px", background: BLUE, color: "#fff", border: "none", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>Save</button>
                          <button onClick={() => setEditingLabel(null)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #d3d1c7", borderRadius: 4, fontSize: 12, cursor: "pointer", color: GRAY_M }}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                          <span style={{ fontSize: 12, color: rev.label ? "var(--color-text-primary)" : GRAY_M, fontStyle: rev.label ? "normal" : "italic" }}>
                            {rev.label || "No label"}
                          </span>
                          <button
                            onClick={() => { setEditingLabel(rev.pathname); setEditLabelValue(rev.label || "") }}
                            style={{ fontSize: 11, color: BLUE, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                          >
                            edit
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginLeft: 12 }}>
                      {!(activeRevision ? rev.pathname === activeRevision : i === 0) && (
                        <button
                          onClick={() => handleRollback(rev.pathname)}
                          disabled={rollingBack}
                          style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${BLUE}`, color: BLUE, borderRadius: 6, fontSize: 12, cursor: "pointer", opacity: rollingBack ? 0.6 : 1, whiteSpace: "nowrap" }}
                        >
                          Restore
                        </button>
                      )}
                      {!(activeRevision ? rev.pathname === activeRevision : i === 0) && (
                        <button
                          onClick={() => handleDelete(rev.pathname)}
                          disabled={deleting === rev.pathname}
                          style={{
                            padding: "6px 14px",
                            background: "transparent",
                            border: `1px solid ${RED}`,
                            color: RED,
                            borderRadius: 6,
                            fontSize: 12,
                            cursor: "pointer",
                            opacity: deleting === rev.pathname ? 0.6 : 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: GRAY_M, padding: "8px 0" }}>
                Keeping up to 52 revisions. Oldest are auto-removed on new uploads.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
