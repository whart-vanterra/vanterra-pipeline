import { NextResponse } from "next/server"

export async function POST(request) {
  const authHeader = request.headers.get("authorization")
  const key = authHeader?.replace("Bearer ", "")

  if (!key || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY
  if (!openRouterKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { deals, nurture, meta, ruleAlerts } = body

  // Build a concise data summary for the LLM
  const loiDeals = deals.filter((d) => d.stage === "LOI Signed")
  const ndaDeals = deals.filter((d) => d.stage === "NDA Signed")
  const engagedDeals = deals.filter((d) => d.stage === "Engaged")
  const ownerConvDeals = deals.filter((d) => d.stage === "Owner Conv.")
  const atRisk = deals.filter((d) => d.health === "at-risk" || d.health === "watch")
  const totalPipeline = deals.reduce((s, d) => s + (d.rev || 0), 0).toFixed(1)

  const dataSummary = `
PIPELINE SNAPSHOT (${meta.weekLabel}):
- Active deals: ${deals.length} totaling $${totalPipeline}M
- LOI Signed (${loiDeals.length}): ${loiDeals.map((d) => `${d.company} $${d.rev}M`).join(", ") || "none"}
- NDA Signed (${ndaDeals.length}): ${ndaDeals.map((d) => `${d.company} $${d.rev}M`).join(", ") || "none"}
- Engaged (${engagedDeals.length}): ${engagedDeals.map((d) => `${d.company} $${d.rev}M`).join(", ") || "none"}
- Owner Conv. (${ownerConvDeals.length}): ${ownerConvDeals.map((d) => `${d.company} $${d.rev}M`).join(", ") || "none"}
- At-risk/watch deals: ${atRisk.map((d) => `${d.company} (${d.health}, ${d.days}d in ${d.stage})`).join(", ") || "none"}

KPIs:
- 2026 acquired: ${meta.kpis?.acquired} (${meta.kpis?.acquiredSub})
- Under LOI: ${meta.kpis?.underLoi}
- Projected: ${meta.kpis?.projected}
- Budget variance: ${meta.kpis?.projectedDeltaLabel}
- Full-year budget: ${meta.kpis?.fullYear} (${meta.kpis?.fullYearSub})

SCORECARD (YTD volume):
${(meta.scorecardVol || []).map((r) => `- ${r.stage}: ${r.yA} actual vs ${r.yT} target${r.avgDays ? `, avg ${r.avgDays}d (tgt ${r.tgtDays}d)` : ""}`).join("\n")}

NURTURE PIPELINE: ${nurture.length} targets
- Scaled ($10M+): ${nurture.filter((n) => n.rev >= 10).length} targets
- Total known revenue: $${nurture.filter((n) => n.rev).reduce((s, n) => s + n.rev, 0).toFixed(1)}M

RULE-BASED ALERTS (for reference):
${ruleAlerts.map((a) => `[${a.type}] ${a.text}`).join("\n")}
`.trim()

  const prompt = `You are a senior M&A analyst writing "Committee Attention Items" for Vanterra Foundations' weekly M&A committee report. These are the 4-7 most important things the investment committee needs to know this week.

Based on the pipeline data below, write concise, specific attention items. Each should be one sentence, data-driven, and actionable. Use exact numbers and company names.

Categorize each as:
- "pos" = positive momentum (green)
- "warn" = risk or gap needing attention (amber)
- "neutral" = notable context or opportunity (gray)

I've included rule-based alerts for reference — use them as a starting point but improve the language, add insight, combine where appropriate, and surface anything the rules missed.

${dataSummary}

Respond with ONLY a JSON array of objects with "type" and "text" fields. No markdown, no explanation.`

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("OpenRouter error:", res.status, errText)
      return NextResponse.json({ error: `AI generation failed: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 })
    }

    // Parse the JSON response — handle potential markdown wrapping
    let alerts
    try {
      const jsonStr = content.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim()
      alerts = JSON.parse(jsonStr)
    } catch {
      console.error("Failed to parse AI response:", content)
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 })
    }

    // Validate structure
    if (!Array.isArray(alerts)) {
      return NextResponse.json({ error: "AI response is not an array" }, { status: 502 })
    }

    const validAlerts = alerts
      .filter((a) => a.type && a.text)
      .map((a) => ({
        type: ["pos", "warn", "neutral"].includes(a.type) ? a.type : "neutral",
        text: String(a.text).trim(),
      }))

    return NextResponse.json({ alerts: validAlerts })
  } catch (err) {
    console.error("AI alert generation error:", err.message)
    return NextResponse.json({ error: `AI generation failed: ${err.message}` }, { status: 500 })
  }
}
