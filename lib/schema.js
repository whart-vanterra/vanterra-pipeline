// Maps the real Vanterra Pipeline spreadsheet format into dashboard JSON.
// The spreadsheet has these key sheets:
//   - Pipeline Detail: master list of all companies with stage, revenue, region, etc.
//   - Pipeline KPIs: scorecard volume + revenue conversion tables
//   - NTM Forecast: next-twelve-months deal schedule
//   - Consolidated Budget: monthly cumulative budget vs actuals
//   - Active Deals: formatted active deal view with stage groupings

const EXCEL_EPOCH = new Date(1899, 11, 30)

function excelDateToString(serial) {
  if (!serial || typeof serial !== "number" || serial < 40000) return null
  const d = new Date(EXCEL_EPOCH.getTime() + serial * 86400000)
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`
}

function excelDateToISO(serial) {
  if (!serial || typeof serial !== "number" || serial < 40000) return null
  const d = new Date(EXCEL_EPOCH.getTime() + serial * 86400000)
  return d.toISOString().split("T")[0]
}

function excelDateToLabel(serial) {
  if (!serial) return null
  const d = new Date(EXCEL_EPOCH.getTime() + serial * 86400000)
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function excelDateToMonthAbbr(serial) {
  if (!serial) return null
  const d = new Date(EXCEL_EPOCH.getTime() + serial * 86400000)
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]
}

function num(val) {
  if (val === null || val === undefined || val === "" || val === "-" || val === "—") return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

function pct(val) {
  const n = num(val)
  if (n === null) return null
  return n < 1 ? Math.round(n * 100) : Math.round(n)
}

function str(val) {
  if (val === null || val === undefined) return null
  return String(val).trim() || null
}

function normalizeStage(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  const map = {
    "Owner Conversation": "Owner Conv.",
    "Owner Conv.": "Owner Conv.",
    "Engaged": "Engaged",
    "NDA Signed": "NDA Signed",
    "NDA Executed & DRL Sent": "NDA Signed",
    "Data Received": "Data Received",
    "Pre-LOI Approval": "Pre-LOI Approval",
    "LOI Signed": "LOI Signed",
    "LOI Executed": "LOI Signed",
    "Closed": "Closed",
    "Closed-won": "Closed",
    "Passed": "Passed",
  }
  return map[s] ?? s
}

function deriveHealth(deal) {
  if (deal.days === null || deal.tgt === null) return "on-track"
  const variance = deal.days - deal.tgt
  if (variance > 30) return "at-risk"
  if (variance > 0) return "watch"
  return "on-track"
}

// Pipeline Detail columns (0-indexed):
// 0:Company, 1:Scale?, 2:Class., 3:Region, 4:State, 5:Stage, 6:Percheron Stage,
// 7:Probability, 8:PW Rev $, 9:Best Case Close, 10:Target Close, 11:Stage Sort,
// 12:Days in Stage, 13:Revenue, 14:EBITDA, 15:% Margin, 16:Deal Source, 17:Commentary

function parsePipelineDetail(rows) {
  const deals = []
  const nurture = []

  for (let i = 6; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[0]) continue

    const company = str(row[0])
    if (!company) continue

    const stage = normalizeStage(row[5])
    if (!stage || stage === "Passed") continue

    const classification = str(row[2])
    const rev = num(row[13])
    const ebitda = num(row[14])
    const marginRaw = num(row[15])
    const margin = marginRaw !== null ? (marginRaw < 1 ? Math.round(marginRaw * 100) : Math.round(marginRaw)) : null
    const days = num(row[12])
    const source = str(row[16])
    const status = str(row[17])
    const region = str(row[3])
    const state = str(row[4])
    const scale = str(row[1]) === "Y"

    if (stage === "Closed") continue

    const activeStages = ["Owner Conv.", "Engaged", "NDA Signed", "LOI Signed"]
    const isActive = classification === "Active" && activeStages.includes(stage)

    if (isActive) {
      const tgtMap = { "Owner Conv.": null, "Engaged": 30, "NDA Signed": 20, "LOI Signed": 90 }
      deals.push({
        company,
        source: source || "",
        city: "",
        state: state || "",
        rev: rev ? Math.round(rev * 10) / 10 : 0,
        days,
        tgt: tgtMap[stage] ?? null,
        stage,
        health: "on-track",
        status: status || "",
      })
    } else if (activeStages.includes(stage) || stage === "Data Received" || stage === "Pre-LOI Approval") {
      const mappedStage = (stage === "Data Received" || stage === "Pre-LOI Approval") ? "NDA Signed" : stage
      nurture.push({
        company,
        stage: mappedStage,
        state: state || "",
        region: region || "Other",
        rev: rev ? Math.round(rev * 10) / 10 : null,
        ebitda: ebitda ? Math.round(ebitda * 10) / 10 : null,
        margin,
        source: source || "",
        days,
        note: status || "",
        scale,
      })
    }
  }

  // Derive health for active deals based on days vs target
  for (const d of deals) {
    d.health = deriveHealth(d)
  }

  return { deals, nurture }
}

// Active Deals sheet - extract city info (Pipeline Detail doesn't have city)
// Col layout: null(0), Company(1), Source(2), City(3), State(4), Revenue(5), Status(6),
//   null(7), Time in Stage(8), Target Time(9), Variance(10)

function parseActiveDealsCities(rows) {
  const cities = {}
  for (let i = 5; i < rows.length; i++) {
    const row = rows[i]
    const company = str(row?.[1])
    const city = str(row?.[3])
    if (company && city) {
      cities[company] = city
    }
  }
  return cities
}

// Pipeline KPIs: volume rows 9-14, revenue rows 17-21
// Cols: null(0), Stage(1), Conversion(2), PW Target(3), PW Actual(4), PW Var(5),
//   null(6), MTD Target(7), MTD Actual(8), MTD Var(9),
//   null(10), YTD Target(11), YTD Actual(12), YTD Var(13),
//   null(14), Days Target(15), Days Avg(16), Days Var(17)

function parseKPIs(rows) {
  const currentWeekDate = num(rows[3]?.[17])
  const weekLabel = currentWeekDate ? `Week of ${excelDateToLabel(currentWeekDate)}` : "Current Week"

  function parseVolRow(row) {
    return {
      stage: str(row[1]) || "",
      conv: num(row[2]) !== null ? `${pct(row[2])}%` : null,
      wT: Math.round((num(row[3]) ?? 0) * 10) / 10,
      wA: Math.round((num(row[4]) ?? 0) * 10) / 10,
      mT: Math.round((num(row[7]) ?? 0) * 10) / 10,
      mA: Math.round((num(row[8]) ?? 0) * 10) / 10,
      yT: Math.round((num(row[11]) ?? 0) * 10) / 10,
      yA: Math.round((num(row[12]) ?? 0) * 10) / 10,
      avgDays: num(row[16]) !== null ? Math.round(num(row[16])) : null,
      tgtDays: num(row[15]) !== null ? Math.round(num(row[15])) : null,
    }
  }

  function parseRevRow(row) {
    return {
      stage: str(row[1]) || "",
      conv: num(row[2]) !== null ? `${pct(row[2])}%` : null,
      wT: Math.round((num(row[3]) ?? 0) * 10) / 10,
      wA: Math.round((num(row[4]) ?? 0) * 10) / 10,
      mT: Math.round((num(row[7]) ?? 0) * 10) / 10,
      mA: Math.round((num(row[8]) ?? 0) * 10) / 10,
      yT: Math.round((num(row[11]) ?? 0) * 10) / 10,
      yA: Math.round((num(row[12]) ?? 0) * 10) / 10,
    }
  }

  const scorecardVol = []
  for (let i = 9; i <= 14; i++) {
    if (rows[i]?.[1]) scorecardVol.push(parseVolRow(rows[i]))
  }

  const scorecardRev = []
  for (let i = 17; i <= 21; i++) {
    if (rows[i]?.[1]) scorecardRev.push(parseRevRow(rows[i]))
  }

  return { weekLabel, scorecardVol, scorecardRev }
}

// NTM Forecast: row 4 header, data rows start at 6 (some gaps)
// Cols: null(0), Company(1), City(2), State(3), Revenue(4), Budget(5),
//   Target Sign(6), Target Close(7), Status(8)

function parseNTM(rows) {
  const ntm = []
  for (let i = 6; i < rows.length; i++) {
    const row = rows[i]
    const co = str(row?.[1])
    if (!co) continue

    ntm.push({
      co,
      city: str(row[2]) || "",
      state: str(row[3]) || "",
      rev: num(row[4]) ? Math.round(num(row[4]) * 10) / 10 : null,
      bud: num(row[5]) ? Math.round(num(row[5]) * 10) / 10 : 0,
      sign: excelDateToString(num(row[6])) || "",
      close: excelDateToString(num(row[7])) || "",
      stage: "Open",
      status: str(row[8]) || "",
    })
  }
  return ntm
}

// Consolidated Budget: rows 4-15 have monthly data
// Col 16: date serial, Col 17: month #, Col 18: cumulative revenue, Col 19: cumulative deals

function parseBudget(rows) {
  const budgetData = []
  for (let i = 4; i <= 15; i++) {
    const row = rows[i]
    const serial = num(row?.[16])
    const budget = num(row?.[18])
    if (serial && budget !== null) {
      budgetData.push({
        m: excelDateToMonthAbbr(serial),
        budget: Math.round(budget * 10) / 10,
        closed: 0,
        loi: 0,
      })
    }
  }
  return budgetData
}

// Main parse function - takes the XLSX workbook sheets as raw arrays
export function parseSpreadsheet(XLSX, buffer) {
  const wb = XLSX.read(buffer, { type: "array" })
  const errors = []

  // Required sheets
  const pdSheet = wb.Sheets["Pipeline Detail"]
  if (!pdSheet) {
    errors.push("Missing required sheet: 'Pipeline Detail'")
    return { data: null, errors }
  }

  const pdRows = XLSX.utils.sheet_to_json(pdSheet, { header: 1 })
  const { deals, nurture } = parsePipelineDetail(pdRows)

  if (deals.length === 0) {
    errors.push("No active deals found in Pipeline Detail")
  }

  // Try to get city data from Active Deals sheet
  const adSheet = wb.Sheets["Active Deals"]
  if (adSheet) {
    const adRows = XLSX.utils.sheet_to_json(adSheet, { header: 1 })
    const cities = parseActiveDealsCities(adRows)
    for (const d of deals) {
      if (cities[d.company]) d.city = cities[d.company]
    }
  }

  // KPIs
  let weekLabel = "Current Week"
  let scorecardVol = []
  let scorecardRev = []
  const kpiSheet = wb.Sheets["Pipeline KPIs"]
  if (kpiSheet) {
    const kpiRows = XLSX.utils.sheet_to_json(kpiSheet, { header: 1 })
    const kpis = parseKPIs(kpiRows)
    weekLabel = kpis.weekLabel
    scorecardVol = kpis.scorecardVol
    scorecardRev = kpis.scorecardRev
  } else {
    errors.push("Warning: 'Pipeline KPIs' sheet not found — scorecard will use defaults")
  }

  // NTM Forecast
  let ntm = []
  const ntmSheet = wb.Sheets["NTM Forecast"]
  if (ntmSheet) {
    const ntmRows = XLSX.utils.sheet_to_json(ntmSheet, { header: 1 })
    ntm = parseNTM(ntmRows)

    // Enrich NTM entries with stage from Pipeline Detail
    const stageMap = {}
    for (let i = 6; i < pdRows.length; i++) {
      const company = str(pdRows[i]?.[0])
      const stage = normalizeStage(pdRows[i]?.[5])
      if (company && stage) stageMap[company] = stage
    }
    for (const entry of ntm) {
      const match = stageMap[entry.co] || stageMap[entry.co.trim()]
      if (match) entry.stage = match
    }
  } else {
    errors.push("Warning: 'NTM Forecast' sheet not found — forecast will use defaults")
  }

  // Budget
  let budgetData = []
  const budgetSheet = wb.Sheets["Consolidated Budget"]
  if (budgetSheet) {
    const budgetRows = XLSX.utils.sheet_to_json(budgetSheet, { header: 1 })
    budgetData = parseBudget(budgetRows)

    // Compute closed (2026 only) and LOI totals from Pipeline Detail
    // Col 23 = Closed date serial; filter to current year
    const currentYear = new Date().getFullYear()
    let budgetClosed = 0
    let budgetLoi = 0
    for (let i = 6; i < pdRows.length; i++) {
      const stage = normalizeStage(pdRows[i]?.[5])
      const rev = num(pdRows[i]?.[13])
      if (!rev) continue
      if (stage === "Closed") {
        const closedSerial = num(pdRows[i]?.[23])
        if (closedSerial) {
          const closedDate = new Date(EXCEL_EPOCH.getTime() + closedSerial * 86400000)
          if (closedDate.getFullYear() === currentYear) budgetClosed += rev
        }
      }
      if (stage === "LOI Signed") budgetLoi += rev
    }
    budgetClosed = Math.round(budgetClosed * 10) / 10
    budgetLoi = Math.round(budgetLoi * 10) / 10

    for (const b of budgetData) {
      b.closed = budgetClosed
      b.loi = budgetLoi
    }
  } else {
    errors.push("Warning: 'Consolidated Budget' sheet not found — budget chart will use defaults")
  }

  // Compute KPI overview values — only count current year closings
  const currentYear = new Date().getFullYear()
  let totalClosed = 0
  let closedCount = 0
  let totalLoi = 0
  let loiCount = 0
  for (let i = 6; i < pdRows.length; i++) {
    const stage = normalizeStage(pdRows[i]?.[5])
    const rev = num(pdRows[i]?.[13])
    if (!rev) continue
    if (stage === "Closed") {
      const closedSerial = num(pdRows[i]?.[23])
      if (closedSerial) {
        const closedDate = new Date(EXCEL_EPOCH.getTime() + closedSerial * 86400000)
        if (closedDate.getFullYear() === currentYear) { totalClosed += rev; closedCount++ }
      }
    }
    if (stage === "LOI Signed") { totalLoi += rev; loiCount++ }
  }
  totalClosed = Math.round(totalClosed * 10) / 10
  totalLoi = Math.round(totalLoi * 10) / 10

  const activePipelineRev = Math.round(deals.reduce((s, d) => s + d.rev, 0) * 10) / 10
  const projected = Math.round((totalClosed + totalLoi) * 10) / 10
  const fullYearBudget = budgetData.length > 0 ? budgetData[budgetData.length - 1].budget : 115.3
  const remaining = Math.round((fullYearBudget - totalClosed) * 10) / 10
  const nextMonthBudget = budgetData.length >= 4 ? budgetData[3].budget : 47.1
  const variance = Math.round((projected - nextMonthBudget) * 10) / 10

  const kpisOverview = {
    acquired: `$${totalClosed}M`,
    acquiredSub: `${closedCount} deal${closedCount !== 1 ? "s" : ""} closed`,
    underLoi: `$${totalLoi}M`,
    underLoiSub: `${loiCount} deal${loiCount !== 1 ? "s" : ""}`,
    projected: `$${projected}M`,
    projectedDelta: variance,
    projectedDeltaLabel: `${variance >= 0 ? "+" : ""}$${variance}M vs. budget`,
    fullYear: `$${fullYearBudget}M`,
    fullYearSub: `$${remaining}M remaining`,
    activePipeline: `$${activePipelineRev}M`,
    activePipelineSub: `${deals.length} active deals`,
  }

  const meta = {
    weekLabel,
    budgetData: budgetData.length > 0 ? budgetData : undefined,
    alerts: undefined,
    kpis: kpisOverview,
    ntm: ntm.length > 0 ? ntm : undefined,
    scorecardVol: scorecardVol.length > 0 ? scorecardVol : undefined,
    scorecardRev: scorecardRev.length > 0 ? scorecardRev : undefined,
  }

  return {
    data: { deals, nurture, meta },
    errors,
    summary: {
      deals: deals.length,
      nurture: nurture.length,
      ntm: ntm.length,
      scorecardVol: scorecardVol.length,
      scorecardRev: scorecardRev.length,
      budgetMonths: budgetData.length,
      sheets: wb.SheetNames,
    },
  }
}
