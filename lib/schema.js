export const dealsColumns = [
  { key: "company", label: "Company", required: true },
  { key: "source", label: "Source", required: true },
  { key: "city", label: "City", required: true },
  { key: "state", label: "State", required: true },
  { key: "rev", label: "Revenue ($M)", required: true, type: "number" },
  { key: "days", label: "Days in Stage", type: "number" },
  { key: "tgt", label: "Target Days", type: "number" },
  { key: "stage", label: "Stage", required: true },
  { key: "health", label: "Health", required: true },
  { key: "status", label: "Status" },
]

export const nurtureColumns = [
  { key: "company", label: "Company", required: true },
  { key: "stage", label: "Stage", required: true },
  { key: "state", label: "State", required: true },
  { key: "region", label: "Region", required: true },
  { key: "rev", label: "Revenue ($M)", type: "number" },
  { key: "ebitda", label: "EBITDA ($M)", type: "number" },
  { key: "margin", label: "Margin (%)", type: "number" },
  { key: "source", label: "Source", required: true },
  { key: "days", label: "Days", type: "number" },
  { key: "note", label: "Notes" },
  { key: "scale", label: "Scale Target", type: "boolean" },
]

export const validStages = ["Owner Conv.", "Engaged", "NDA Signed", "LOI Signed"]
export const validHealth = ["on-track", "watch", "at-risk"]
export const validRegions = ["Southeast", "Northeast", "Midwest", "Southwest", "Mountain West", "Other"]

export function validateDeals(rows) {
  const errors = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.company) errors.push(`Row ${i + 1}: missing company`)
    if (!row.stage) errors.push(`Row ${i + 1}: missing stage`)
    if (row.stage && !validStages.includes(row.stage)) errors.push(`Row ${i + 1}: invalid stage "${row.stage}"`)
    if (row.health && !validHealth.includes(row.health)) errors.push(`Row ${i + 1}: invalid health "${row.health}"`)
  }
  return errors
}

export function validateNurture(rows) {
  const errors = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.company) errors.push(`Row ${i + 1}: missing company`)
    if (!row.stage) errors.push(`Row ${i + 1}: missing stage`)
    if (row.region && !validRegions.includes(row.region)) errors.push(`Row ${i + 1}: invalid region "${row.region}"`)
  }
  return errors
}

function normalizeNumber(val) {
  if (val === null || val === undefined || val === "" || val === "—") return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

function normalizeBoolean(val) {
  if (val === true || val === "true" || val === "TRUE" || val === "yes" || val === "YES" || val === 1) return true
  return false
}

export function parseSheetRow(row, columns) {
  const result = {}
  for (const col of columns) {
    let val = row[col.label] ?? row[col.key] ?? null
    if (col.type === "number") {
      val = normalizeNumber(val)
    } else if (col.type === "boolean") {
      val = normalizeBoolean(val)
    } else if (val !== null) {
      val = String(val).trim()
      if (val === "" || val === "—") val = null
    }
    result[col.key] = val
  }
  return result
}
