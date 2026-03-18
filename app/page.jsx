"use client"
import KeyGate from "../components/KeyGate"
import Dashboard from "../components/Dashboard"
import { useData } from "../lib/use-data"

function DashboardWithData({ role, accessKey, onLogout }) {
  const { data, loading, error } = useData(accessKey)

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
        <div style={{ color: "#888780", fontSize: 14 }}>Loading pipeline data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
        <div style={{ color: "#A32D2D", fontSize: 14 }}>{error}</div>
      </div>
    )
  }

  return <Dashboard data={data} role={role} onLogout={onLogout} />
}

export default function Page() {
  return (
    <KeyGate>
      {({ role, key, onLogout }) => (
        <DashboardWithData role={role} accessKey={key} onLogout={onLogout} />
      )}
    </KeyGate>
  )
}
