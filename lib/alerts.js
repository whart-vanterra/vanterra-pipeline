// Generates Committee attention items automatically from pipeline data.
// Each alert has a type: "pos" (green), "warn" (amber), or "neutral" (gray).

export function generateAlerts(data) {
  const { deals, nurture, meta } = data
  const alerts = []
  const kpis = meta.kpis
  const vol = meta.scorecardVol || []
  const ntm = meta.ntm || []
  const budgetData = meta.budgetData || []

  // --- Budget performance ---
  if (kpis) {
    const projected = parseFloat(kpis.projected?.replace(/[$M]/g, "")) || 0
    const acquired = parseFloat(kpis.acquired?.replace(/[$M]/g, "")) || 0
    const loiVal = parseFloat(kpis.underLoi?.replace(/[$M]/g, "")) || 0

    // Find the next month's budget target for comparison
    const now = new Date()
    const nextMonthIdx = Math.min(now.getMonth() + 1, budgetData.length - 1)
    const nextBudget = budgetData[nextMonthIdx]?.budget || 0
    const nextMonthName = budgetData[nextMonthIdx]?.m || ""

    if (nextBudget > 0 && projected > 0) {
      const variance = Math.round((projected - nextBudget) * 10) / 10
      if (variance > 0) {
        alerts.push({
          type: "pos",
          text: `Ahead of ${nextMonthName} budget by $${variance}M — $${projected}M projected vs. $${nextBudget}M target`,
        })
      } else if (variance < -5) {
        alerts.push({
          type: "warn",
          text: `Behind ${nextMonthName} budget by $${Math.abs(variance)}M — $${projected}M projected vs. $${nextBudget}M target`,
        })
      }
    }

    // LOI progress
    const loiDeals = deals.filter((d) => d.stage === "LOI Signed")
    if (loiDeals.length > 0) {
      const loiNames = loiDeals.map((d) => d.company).join(" and ")
      alerts.push({
        type: "pos",
        text: `${loiDeals.length} LOI${loiDeals.length > 1 ? "s" : ""} signed and progressing to close: ${loiNames}`,
      })
    }
  }

  // --- Weekly owner conversation volume ---
  const ownerConvRow = vol.find((r) => r.stage === "Owner conversations" || r.stage === "Owner Conversations")
  if (ownerConvRow) {
    const actual = ownerConvRow.wA
    const target = ownerConvRow.wT
    if (actual > 0 && target > 0) {
      if (actual >= target) {
        alerts.push({
          type: "pos",
          text: `${actual} new owner conversations this week${actual > target ? `, exceeding ${target}-per-week target` : ", hitting target"}`,
        })
      } else if (actual < target * 0.5) {
        alerts.push({
          type: "warn",
          text: `Only ${actual} owner conversations this week vs. ${target} target — outreach velocity needs attention`,
        })
      }
    }
  }

  // --- NDA conversion gap ---
  const ndaRow = vol.find((r) => r.stage === "NDAs")
  if (ndaRow && ndaRow.yT > 0) {
    const gap = ndaRow.yA - ndaRow.yT
    if (gap < -2) {
      const revGap = meta.scorecardRev?.find((r) => r.stage === "NDAs")
      const revShortfall = revGap ? Math.abs(Math.round((revGap.yA - revGap.yT) * 10) / 10) : null
      alerts.push({
        type: "warn",
        text: `YTD NDA conversion below target — ${ndaRow.yA} executed vs. ${ndaRow.yT} target${revShortfall ? `; revenue gap of $${revShortfall}M` : ""}`,
      })
    }
  }

  // --- At-risk / stalled deals ---
  const stalledDeals = deals.filter((d) => d.health === "at-risk" || (d.days && d.tgt && d.days > d.tgt * 2))
  for (const d of stalledDeals) {
    const overBy = d.days - (d.tgt || 0)
    alerts.push({
      type: "warn",
      text: `${d.company} stalled at ${d.days} days in ${d.stage} stage${d.tgt ? ` vs. ${d.tgt}-day target` : ""}`,
    })
  }

  // --- Large-scale opportunities in early stage ---
  const bigEarlyDeals = deals.filter(
    (d) => d.rev >= 20 && (d.stage === "Owner Conv." || d.stage === "Engaged")
  )
  if (bigEarlyDeals.length > 0) {
    const names = bigEarlyDeals.map((d) => `${d.company} ($${d.rev}M)`).join(" and ")
    alerts.push({
      type: "neutral",
      text: `${names} in early conversations — large-scale upside if converted`,
    })
  }

  // --- Watch deals (not at-risk but over target) ---
  const watchDeals = deals.filter((d) => d.health === "watch" && d.stage !== "Owner Conv.")
  if (watchDeals.length > 0 && stalledDeals.length === 0) {
    const names = watchDeals.map((d) => d.company).join(", ")
    alerts.push({
      type: "neutral",
      text: `${watchDeals.length} deal${watchDeals.length > 1 ? "s" : ""} on watch: ${names}`,
    })
  }

  // --- Nurture pipeline size ---
  const nurtureScaled = nurture.filter((d) => d.rev && d.rev >= 10)
  if (nurtureScaled.length >= 5) {
    const totalRev = Math.round(nurtureScaled.reduce((s, d) => s + d.rev, 0) * 10) / 10
    alerts.push({
      type: "neutral",
      text: `${nurtureScaled.length} scaled targets ($10M+) in nurture pipeline totaling $${totalRev}M — future acquisition runway`,
    })
  }

  return alerts
}
