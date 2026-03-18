"use client"
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from "recharts";
import { deals as defaultDeals, nurture as defaultNurture, meta as defaultMeta } from "../lib/data";

const BLUE = "#185FA5", BLUE_L = "#E6F1FB", BLUE_D = "#0C447C";
const GREEN = "#3B6D11", GREEN_L = "#EAF3DE", GREEN_M = "#639922";
const AMBER = "#854F0B", AMBER_L = "#FAEEDA", AMBER_M = "#BA7517";
const RED = "#A32D2D", RED_L = "#FCEBEB";
const GRAY = "#5F5E5A", GRAY_L = "#F1EFE8", GRAY_M = "#888780";
const TEAL = "#0F6E56", TEAL_L = "#E1F5EE";
const PURPLE = "#534AB7", PURPLE_L = "#EEEDFE";

const pages = ["Overview", "Active pipeline", "KPI scorecard", "NTM forecast", "Nurture tracker"];

function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: GRAY_M, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>{sub}</div>
      <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{title}</h2>
    </div>
  );
}
function Kpi({ label, value, delta, deltaLabel, color, sub }) {
  const dc = delta === undefined ? null : delta > 0 ? GREEN : delta < 0 ? RED : GRAY;
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "16px 18px", flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: GRAY_M, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 500, color: color || "var(--color-text-primary)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: GRAY_M, marginTop: 5 }}>{sub}</div>}
      {delta !== undefined && <div style={{ fontSize: 12, color: dc, marginTop: 5, fontWeight: 500 }}>{delta > 0 ? "+" : ""}{deltaLabel || delta}</div>}
    </div>
  );
}
function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 500, color: GRAY_M, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14, marginTop: 28 }}>{children}</div>;
}
function Rule() { return <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", margin: "28px 0" }} />; }
function Badge({ label, bg, fg }) {
  return <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 500, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>{label}</span>;
}

// ── style maps ───────────────────────────────────────────────────
const stageOrder = { "Owner Conv.": 0, "Engaged": 1, "NDA Signed": 2, "LOI Signed": 3 };
const stagePill = {
  "LOI Signed":  [BLUE_L, BLUE_D],
  "NDA Signed":  [GREEN_L, GREEN],
  "Engaged":     [AMBER_L, AMBER],
  "Owner Conv.": [GRAY_L, GRAY],
};
const healthPill = { "on-track": [GREEN_L, GREEN], "watch": [AMBER_L, AMBER], "at-risk": [RED_L, RED] };
const healthLabel = { "on-track": "On track", "watch": "Watch", "at-risk": "At risk" };

const scaleGroups = [
  { key: "large", label: "Scaled targets ($10M+ revenue)", filter: d => d.rev >= 10 },
  { key: "mid", label: "Mid-scale targets ($5M–$10M revenue)", filter: d => d.rev >= 5 && d.rev < 10 },
  { key: "small", label: "Sub-scale / developing targets (<$5M or revenue TBD)", filter: d => !d.rev || d.rev < 5 },
];

const nurtureStagePill = {
  "NDA Signed":  [GREEN_L, GREEN],
  "Engaged":     [AMBER_L, AMBER],
  "Owner Conv.": [GRAY_L, GRAY],
};

// ── pages ─────────────────────────────────────────────────────────
function Overview({ meta }) {
  const budgetData = meta.budgetData;
  const alerts = meta.alerts;
  const kpis = meta.kpis;
  const alertStyle = { pos: [GREEN_L, "#27500A", GREEN_M], warn: [AMBER_L, "#633806", AMBER_M], neutral: [GRAY_L, "#444441", GRAY_M] };
  return (
    <div>
      <PageHeader title="M&A pipeline overview" sub={`${meta.weekLabel} · Confidential`} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <Kpi label="2026 acquired" value={kpis.acquired} sub={kpis.acquiredSub} color={BLUE} />
        <Kpi label="Under LOI" value={kpis.underLoi} sub={kpis.underLoiSub} color={GREEN} />
        <Kpi label="Projected thru Apr" value={kpis.projected} delta={kpis.projectedDelta} deltaLabel={kpis.projectedDeltaLabel} color={GREEN} />
        <Kpi label="Full-year budget" value={kpis.fullYear} sub={kpis.fullYearSub} />
        <Kpi label="Active pipeline" value={kpis.activePipeline} sub={kpis.activePipelineSub} />
      </div>
      <SectionTitle>Cumulative 2026 revenue vs. budget</SectionTitle>
      <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 12, color: GRAY_M }}>
        {[["#185FA5","Closed-Won"],["#85B7EB","LOI Executed"],["#B4B2A9","Annual budget"]].map(([c,l]) => (
          <span key={l} style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, borderRadius:2, background:c, display:"inline-block" }} />{l}</span>
        ))}
      </div>
      <div style={{ position: "relative", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={budgetData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D3D1C7" vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 11, fill: GRAY_M }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: GRAY_M }} axisLine={false} tickLine={false} tickFormatter={v => `${v}M`} />
            <Tooltip formatter={(v, n) => [`${v}M`, n]} contentStyle={{ fontSize: 12, border: `0.5px solid #D3D1C7`, borderRadius: 6 }} />
            <Bar dataKey="closed" stackId="a" fill="#185FA5" name="Closed-Won" />
            <Bar dataKey="loi" stackId="a" fill="#85B7EB" name="LOI Executed" radius={[3,3,0,0]} />
            <Line type="monotone" dataKey="budget" stroke="#B4B2A9" strokeWidth={1.5} dot={false} name="Budget" strokeDasharray="5 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Rule />
      <SectionTitle>Committee attention items</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map((a, i) => {
          const [bg, fg, dot] = alertStyle[a.type];
          return (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: bg, borderRadius: 8, padding: "11px 14px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, marginTop: 4, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: fg, lineHeight: 1.5 }}>{a.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivePipeline({ deals, meta }) {
  const [filter, setFilter] = useState("All");
  const stages = ["All", "Owner Conv.", "Engaged", "NDA Signed", "LOI Signed"];
  const visible = filter === "All" ? deals : deals.filter(d => d.stage === filter);
  const sorted = [...visible].sort((a, b) => (stageOrder[a.stage] ?? 9) - (stageOrder[b.stage] ?? 9));
  const stageGroups = ["Owner Conv.", "Engaged", "NDA Signed", "LOI Signed"];
  const grouped = stageGroups.map(s => ({ stage: s, rev: deals.filter(d => d.stage === s).reduce((sum, d) => sum + d.rev, 0), count: deals.filter(d => d.stage === s).length }));
  return (
    <div>
      <PageHeader title="Active deal pipeline" sub={meta.weekLabel} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {grouped.map(g => {
          const [bg, fg] = stagePill[g.stage];
          return (
            <div key={g.stage} style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 18px", flex: 1, minWidth: 120 }}>
              <div style={{ marginBottom: 8 }}><Badge label={g.stage} bg={bg} fg={fg} /></div>
              <div style={{ fontSize: 22, fontWeight: 500 }}>${g.rev.toFixed(1)}M</div>
              <div style={{ fontSize: 12, color: GRAY_M, marginTop: 4 }}>{g.count} deal{g.count !== 1 ? "s" : ""}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {stages.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "5px 14px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: filter === s ? "var(--color-background-secondary)" : "transparent", cursor: "pointer", fontSize: 12, color: "var(--color-text-primary)", fontWeight: filter === s ? 500 : 400 }}>{s}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map((d, i) => {
          const [sbg, sfg] = stagePill[d.stage];
          const [hbg, hfg] = healthPill[d.health];
          const daysOver = d.days !== null && d.tgt !== null ? d.days - d.tgt : null;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 40px 60px 72px 80px 72px", gap: 10, alignItems: "center", padding: "11px 14px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{d.company}</div>
                <div style={{ fontSize: 11, color: GRAY_M }}>{d.city}, {d.state} · {d.source}</div>
              </div>
              <div><Badge label={d.stage} bg={sbg} fg={sfg} /></div>
              <div style={{ fontSize: 13, fontWeight: 500, textAlign: "right" }}>${d.rev}M</div>
              <div style={{ fontSize: 12, textAlign: "right", color: daysOver !== null && daysOver > 0 ? RED : "var(--color-text-secondary)" }}>{d.days !== null ? `${d.days}d` : "—"}</div>
              <div style={{ fontSize: 12, textAlign: "right" }}>
                {daysOver !== null ? (daysOver > 0 ? <span style={{ color: RED, fontWeight: 500 }}>+{daysOver}d</span> : <span style={{ color: GREEN }}>{daysOver}d</span>) : "—"}
              </div>
              <div style={{ fontSize: 11, color: GRAY_M, lineHeight: 1.4 }}>{d.status}</div>
              <div style={{ textAlign: "right" }}><Badge label={healthLabel[d.health]} bg={hbg} fg={hfg} /></div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 20, fontSize: 12, color: GRAY_M }}>
        <span>Total pipeline: <strong style={{ color: "var(--color-text-primary)" }}>${deals.reduce((s, d) => s + d.rev, 0).toFixed(1)}M</strong></span>
        <span>PW current week: <strong style={{ color: "var(--color-text-primary)" }}>$46M</strong> (prior: $75M)</span>
        <span>Removed: HomeSpec, KCS, Ground Up</span>
      </div>
    </div>
  );
}

function Scorecard({ meta }) {
  const vol = meta.scorecardVol;
  const rev = meta.scorecardRev;
  const ytdBarData = vol.map(r => ({ stage: r.stage.split(" ")[0], actual: r.yA, target: r.yT }));
  const groupBg = { weekly: "#EEF4FB", mtd: "#F4F8EE", ytd: "#F5F4F2" };
  const groupFg = { weekly: BLUE_D, mtd: GREEN, ytd: GRAY };
  const thBase = { padding: "7px 10px", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", borderBottom: "0.5px solid var(--color-border-tertiary)" };
  const thGroup = (g) => ({ ...thBase, background: groupBg[g], color: groupFg[g], textAlign: "center" });
  const thSub = (g) => ({ ...thBase, background: groupBg[g], color: groupFg[g], textAlign: "right", fontWeight: 400, fontSize: 11 });
  const thLeft = { ...thBase, textAlign: "left", color: GRAY_M };
  const thMid = { ...thBase, color: GRAY_M, textAlign: "right" };
  const tdS = (align = "right") => ({ padding: "9px 10px", fontSize: 13, textAlign: align });
  const tdGroup = (g, extra = {}) => ({ ...tdS(), background: groupBg[g] + "55", ...extra });
  function VarCell({ actual, target, prefix = "", grp }) {
    const v = actual - target;
    const color = v > 0 ? GREEN : v < 0 ? RED : GRAY_M;
    return <td style={{ ...tdGroup(grp), color, fontWeight: 500, borderRight: `1px solid var(--color-border-tertiary)` }}>{v > 0 ? "+" : ""}{prefix}{v.toFixed(v % 1 === 0 ? 0 : 1)}</td>;
  }
  return (
    <div>
      <PageHeader title="KPI scorecard" sub={meta.weekLabel} />
      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12, color: GRAY_M }}>
        {[["#185FA5","Actual"],["#D3D1C7","Target"]].map(([c,l]) => (
          <span key={l} style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, borderRadius:2, background:c, display:"inline-block" }} />{l}</span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
        <div>
          <SectionTitle>Weekly volume vs. target</SectionTitle>
          <div style={{ position: "relative", height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vol.map(r => ({ stage: r.stage.split(" ")[0], actual: r.wA, target: r.wT }))} margin={{ top:4, right:4, left:0, bottom:0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#D3D1C7" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize:11, fill:GRAY_M }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:GRAY_M }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize:12, border:"0.5px solid #D3D1C7", borderRadius:6 }} />
                <Bar dataKey="target" fill="#D3D1C7" name="Target" radius={[2,2,0,0]} />
                <Bar dataKey="actual" fill="#185FA5" name="Actual" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <SectionTitle>YTD volume vs. target</SectionTitle>
          <div style={{ position: "relative", height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ytdBarData} margin={{ top:4, right:4, left:0, bottom:0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#D3D1C7" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize:11, fill:GRAY_M }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:GRAY_M }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize:12, border:"0.5px solid #D3D1C7", borderRadius:6 }} />
                <Bar dataKey="target" fill="#D3D1C7" name="Target" radius={[2,2,0,0]} />
                <Bar dataKey="actual" fill="#185FA5" name="Actual" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <SectionTitle>Volume conversion — detail</SectionTitle>
      <div style={{ overflowX: "auto", marginBottom: 28 }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thLeft }} rowSpan={2}>Stage</th>
              <th style={{ ...thMid }} rowSpan={2}>Conv.</th>
              <th colSpan={3} style={{ ...thGroup("weekly"), borderLeft:"1px solid var(--color-border-tertiary)", borderRight:"1px solid var(--color-border-tertiary)" }}>Weekly</th>
              <th colSpan={3} style={{ ...thGroup("mtd"), borderRight:"1px solid var(--color-border-tertiary)" }}>Month-to-date</th>
              <th colSpan={3} style={{ ...thGroup("ytd"), borderRight:"1px solid var(--color-border-tertiary)" }}>Year-to-date</th>
              <th colSpan={2} style={{ ...thMid }}>Days in stage</th>
            </tr>
            <tr>
              {[["weekly","Tgt"],["weekly","Act"],["weekly","Var"],["mtd","Tgt"],["mtd","Act"],["mtd","Var"],["ytd","Tgt"],["ytd","Act"],["ytd","Var"]].map(([g,l],i) => (
                <th key={i} style={{ ...thSub(g), borderLeft:i===0?"1px solid var(--color-border-tertiary)":"none", borderRight:(i===2||i===5||i===8)?"1px solid var(--color-border-tertiary)":"none" }}>{l}</th>
              ))}
              <th style={{ ...thMid }}>Avg</th><th style={{ ...thMid }}>Tgt</th>
            </tr>
          </thead>
          <tbody>
            {vol.map((r,i) => (
              <tr key={i} style={{ borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ ...tdS("left"), fontWeight:500 }}>{r.stage}</td>
                <td style={{ ...tdS(), color:GRAY_M }}>{r.conv||"—"}</td>
                <td style={{ ...tdGroup("weekly"), borderLeft:"1px solid var(--color-border-tertiary)", color:GRAY_M }}>{r.wT}</td>
                <td style={{ ...tdGroup("weekly"), fontWeight:500 }}>{r.wA}</td>
                <VarCell actual={r.wA} target={r.wT} grp="weekly" />
                <td style={{ ...tdGroup("mtd"), color:GRAY_M }}>{r.mT}</td>
                <td style={{ ...tdGroup("mtd"), fontWeight:500 }}>{r.mA}</td>
                <VarCell actual={r.mA} target={r.mT} grp="mtd" />
                <td style={{ ...tdGroup("ytd"), color:GRAY_M }}>{r.yT}</td>
                <td style={{ ...tdGroup("ytd"), fontWeight:500 }}>{r.yA}</td>
                <VarCell actual={r.yA} target={r.yT} grp="ytd" />
                <td style={{ ...tdS(), color:r.avgDays>r.tgtDays?RED:r.avgDays<r.tgtDays?GREEN:GRAY_M, fontWeight:r.avgDays!==r.tgtDays?500:400 }}>{r.avgDays??"—"}</td>
                <td style={{ ...tdS(), color:GRAY_M }}>{r.tgtDays??"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SectionTitle>Revenue conversion ($M)</SectionTitle>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thLeft }} rowSpan={2}>Stage</th>
              <th style={{ ...thMid }} rowSpan={2}>Conv.</th>
              <th colSpan={3} style={{ ...thGroup("weekly"), borderLeft:"1px solid var(--color-border-tertiary)", borderRight:"1px solid var(--color-border-tertiary)" }}>Weekly</th>
              <th colSpan={3} style={{ ...thGroup("mtd"), borderRight:"1px solid var(--color-border-tertiary)" }}>Month-to-date</th>
              <th colSpan={3} style={{ ...thGroup("ytd"), borderRight:"1px solid var(--color-border-tertiary)" }}>Year-to-date</th>
            </tr>
            <tr>
              {[["weekly","Tgt"],["weekly","Act"],["weekly","Var"],["mtd","Tgt"],["mtd","Act"],["mtd","Var"],["ytd","Tgt"],["ytd","Act"],["ytd","Var"]].map(([g,l],i) => (
                <th key={i} style={{ ...thSub(g), borderLeft:i===0?"1px solid var(--color-border-tertiary)":"none", borderRight:(i===2||i===5||i===8)?"1px solid var(--color-border-tertiary)":"none" }}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rev.map((r,i) => (
              <tr key={i} style={{ borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ ...tdS("left"), fontWeight:500 }}>{r.stage}</td>
                <td style={{ ...tdS(), color:GRAY_M }}>{r.conv}</td>
                <td style={{ ...tdGroup("weekly"), borderLeft:"1px solid var(--color-border-tertiary)", color:GRAY_M }}>${r.wT}</td>
                <td style={{ ...tdGroup("weekly"), fontWeight:500 }}>${r.wA}</td>
                <VarCell actual={r.wA} target={r.wT} prefix="$" grp="weekly" />
                <td style={{ ...tdGroup("mtd"), color:GRAY_M }}>${r.mT}</td>
                <td style={{ ...tdGroup("mtd"), fontWeight:500 }}>${r.mA}</td>
                <VarCell actual={r.mA} target={r.mT} prefix="$" grp="mtd" />
                <td style={{ ...tdGroup("ytd"), color:GRAY_M }}>${r.yT}</td>
                <td style={{ ...tdGroup("ytd"), fontWeight:500 }}>${r.yA}</td>
                <VarCell actual={r.yA} target={r.yT} prefix="$" grp="ytd" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NTMForecast({ meta }) {
  const ntm = meta.ntm;
  const barData = ntm.filter(d => d.rev).map(d => ({ name: d.co.split(" ")[0], rev: d.rev, bud: d.bud }));
  const tracker = [
    { label: "Acquired revenue", count: 2, value: 47.8, color: BLUE },
    { label: "Revenue signed / under LOI", count: 2, value: 9.2, color: GREEN },
    { label: "Projected (through Apr-26)", count: 4, value: 57.0, color: GREEN },
    { label: "Budget (through Apr-26)", count: 2, value: 47.1, color: GRAY },
    { label: "Variance to budget", count: null, value: 9.9, color: GREEN, positive: true },
  ];
  return (
    <div>
      <PageHeader title="NTM deal forecast" sub={meta.weekLabel} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        {tracker.map((t, i) => (
          <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 18px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: GRAY_M, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.label}</div>
            <div style={{ fontSize: 26, fontWeight: 500, color: t.color, lineHeight: 1 }}>{t.positive ? "+" : ""}${t.value}M</div>
            {t.count && <div style={{ fontSize: 12, color: GRAY_M, marginTop: 5 }}>{t.count} deals</div>}
          </div>
        ))}
      </div>
      <SectionTitle>Deal revenue vs. budget allocation</SectionTitle>
      <div style={{ display:"flex", gap:16, marginBottom:10, fontSize:12, color:GRAY_M }}>
        {[["#185FA5","Deal revenue"],["#D3D1C7","Budget slot"]].map(([c,l]) => (
          <span key={l} style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, borderRadius:2, background:c, display:"inline-block" }} />{l}</span>
        ))}
      </div>
      <div style={{ position:"relative", height:220, marginBottom:28 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top:4, right:4, left:0, bottom:0 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#D3D1C7" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize:10, fill:GRAY_M }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:11, fill:GRAY_M }} axisLine={false} tickLine={false} tickFormatter={v => `${v}M`} />
            <Tooltip formatter={(v,n) => [`${v}M`, n]} contentStyle={{ fontSize:12, border:"0.5px solid #D3D1C7", borderRadius:6 }} />
            <Bar dataKey="bud" fill="#D3D1C7" name="Budget slot" radius={[2,2,0,0]} />
            <Bar dataKey="rev" fill="#185FA5" name="Deal revenue" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SectionTitle>Deal-by-deal schedule</SectionTitle>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr>
              {["Company","State","Revenue","Budget","Target sign","Target close","Stage","Status"].map(h => (
                <th key={h} style={{ textAlign:h==="Company"||h==="Status"?"left":"right", padding:"7px 10px", fontSize:11, fontWeight:500, color:GRAY_M, borderBottom:"0.5px solid var(--color-border-tertiary)", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ntm.map((d,i) => {
              const [sbg, sfg] = stagePill[d.stage] || [GRAY_L, GRAY];
              const over = d.rev && d.bud ? d.rev > d.bud : false;
              const isOpen = !d.rev;
              return (
                <tr key={i} style={{ borderBottom:"0.5px solid var(--color-border-tertiary)", opacity:isOpen?0.55:1 }}>
                  <td style={{ padding:"9px 10px", fontWeight:isOpen?400:500, fontStyle:isOpen?"italic":"normal" }}>{d.co}</td>
                  <td style={{ padding:"9px 10px", textAlign:"right", color:GRAY_M }}>{d.state}</td>
                  <td style={{ padding:"9px 10px", textAlign:"right", fontWeight:500, color:over?GREEN:"var(--color-text-primary)" }}>{d.rev?`${d.rev}M`:"—"}</td>
                  <td style={{ padding:"9px 10px", textAlign:"right", color:GRAY_M }}>${d.bud}M</td>
                  <td style={{ padding:"9px 10px", textAlign:"right", color:GRAY_M, fontSize:12 }}>{d.sign}</td>
                  <td style={{ padding:"9px 10px", textAlign:"right", color:GRAY_M, fontSize:12 }}>{d.close}</td>
                  <td style={{ padding:"9px 10px", textAlign:"right" }}>{!isOpen && <Badge label={d.stage} bg={sbg} fg={sfg} />}</td>
                  <td style={{ padding:"9px 10px", color:GRAY_M, fontSize:12, maxWidth:240 }}>{d.status}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:"1px solid var(--color-border-secondary)" }}>
              <td colSpan={2} style={{ padding:"10px 10px", fontWeight:500, fontSize:13 }}>Pre-LOI total · 12 deals</td>
              <td style={{ padding:"10px 10px", textAlign:"right", fontWeight:500, fontSize:13 }}>$100.9M</td>
              <td colSpan={5} style={{ padding:"10px 10px", color:GRAY_M, fontSize:12 }}>Average revenue per deal: $8.4M</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function NurtureTracker({ nurture, meta }) {
  const [stageFilter, setStageFilter] = useState("All");
  const [expandedGroups, setExpandedGroups] = useState({ large: true, mid: true, small: false });

  const stageFilters = ["All", "NDA Signed", "Engaged", "Owner Conv."];

  const filtered = stageFilter === "All" ? nurture : nurture.filter(d => d.stage === stageFilter);

  const totalRev = nurture.filter(d => d.rev).reduce((s, d) => s + d.rev, 0);
  const ndaCount = nurture.filter(d => d.stage === "NDA Signed").length;
  const engagedCount = nurture.filter(d => d.stage === "Engaged").length;
  const convCount = nurture.filter(d => d.stage === "Owner Conv.").length;

  const stageSummary = [
    { stage: "NDA Signed", count: ndaCount, rev: nurture.filter(d => d.stage === "NDA Signed" && d.rev).reduce((s,d) => s+d.rev, 0), pill: [GREEN_L, GREEN] },
    { stage: "Engaged", count: engagedCount, rev: nurture.filter(d => d.stage === "Engaged" && d.rev).reduce((s,d) => s+d.rev, 0), pill: [AMBER_L, AMBER] },
    { stage: "Owner Conv.", count: convCount, rev: nurture.filter(d => d.stage === "Owner Conv." && d.rev).reduce((s,d) => s+d.rev, 0), pill: [GRAY_L, GRAY] },
  ];

  const toggle = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const thS = { padding: "7px 10px", fontSize: 11, fontWeight: 500, color: GRAY_M, borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap" };
  const tdS = (align = "left") => ({ padding: "9px 10px", fontSize: 12, textAlign: align, verticalAlign: "top" });

  return (
    <div>
      <PageHeader title="Nurture pipeline tracker" sub={meta.weekLabel} />

      <div style={{ background: PURPLE_L, borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: PURPLE }}>
        Long-dated and slow-play targets currently being cultivated. These are not in the active deal pipeline or NTM forecast but represent the future acquisition runway. Conversion of even a small number of these — particularly the scaled targets — would materially impact the 2H 2026 and 2027 pipeline.
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: GRAY_M, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total nurture targets</div>
          <div style={{ fontSize: 28, fontWeight: 500, color: "var(--color-text-primary)" }}>{nurture.length}</div>
        </div>
        <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: GRAY_M, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total revenue (where known)</div>
          <div style={{ fontSize: 28, fontWeight: 500, color: BLUE }}>${totalRev.toFixed(1)}M</div>
        </div>
        {stageSummary.map(s => (
          <div key={s.stage} style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px 18px", flex: 1, minWidth: 120 }}>
            <div style={{ marginBottom: 8 }}><Badge label={s.stage} bg={s.pill[0]} fg={s.pill[1]} /></div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>{s.count} targets</div>
            <div style={{ fontSize: 12, color: GRAY_M, marginTop: 4 }}>${s.rev.toFixed(1)}M known rev</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {stageFilters.map(s => (
          <button key={s} onClick={() => setStageFilter(s)} style={{ padding: "5px 14px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: stageFilter === s ? "var(--color-background-secondary)" : "transparent", cursor: "pointer", fontSize: 12, color: "var(--color-text-primary)", fontWeight: stageFilter === s ? 500 : 400 }}>{s}</button>
        ))}
      </div>

      {scaleGroups.map(group => {
        const rows = filtered.filter(group.filter).sort((a, b) => (b.rev || 0) - (a.rev || 0));
        if (rows.length === 0) return null;
        const groupRev = rows.filter(d => d.rev).reduce((s, d) => s + d.rev, 0);
        const isExpanded = expandedGroups[group.key];
        return (
          <div key={group.key} style={{ marginBottom: 16 }}>
            <div
              onClick={() => toggle(group.key)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: isExpanded ? "8px 8px 0 0" : 8, cursor: "pointer", userSelect: "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{group.label}</span>
                <span style={{ fontSize: 12, color: GRAY_M }}>{rows.length} targets · ${groupRev.toFixed(1)}M known revenue</span>
              </div>
              <span style={{ fontSize: 12, color: GRAY_M }}>{isExpanded ? "collapse" : "expand"}</span>
            </div>
            {isExpanded && (
              <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderTop: "none", borderRadius: "0 0 8px 8px", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--color-background-secondary)" }}>
                      <th style={{ ...thS, textAlign: "left" }}>Company</th>
                      <th style={thS}>Stage</th>
                      <th style={thS}>State</th>
                      <th style={thS}>Region</th>
                      <th style={thS}>Revenue</th>
                      <th style={thS}>EBITDA</th>
                      <th style={thS}>Margin</th>
                      <th style={thS}>Days</th>
                      <th style={{ ...thS, textAlign: "left" }}>Source</th>
                      <th style={{ ...thS, textAlign: "left" }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d, i) => {
                      const [sbg, sfg] = nurtureStagePill[d.stage] || [GRAY_L, GRAY];
                      return (
                        <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                          <td style={{ ...tdS(), fontWeight: 500 }}>{d.company}</td>
                          <td style={{ ...tdS("right") }}><Badge label={d.stage} bg={sbg} fg={sfg} /></td>
                          <td style={{ ...tdS("right"), color: GRAY_M }}>{d.state}</td>
                          <td style={{ ...tdS("right"), color: GRAY_M, fontSize: 11 }}>{d.region}</td>
                          <td style={{ ...tdS("right"), fontWeight: d.rev ? 500 : 400, color: d.rev ? "var(--color-text-primary)" : GRAY_M }}>{d.rev ? `${d.rev}M` : "—"}</td>
                          <td style={{ ...tdS("right"), color: GRAY_M }}>{d.ebitda ? `${d.ebitda}M` : "—"}</td>
                          <td style={{ ...tdS("right"), color: d.margin ? GREEN : GRAY_M }}>{d.margin ? `${d.margin}%` : "—"}</td>
                          <td style={{ ...tdS("right"), color: d.days > 365 ? AMBER : GRAY_M }}>{d.days ?? "—"}</td>
                          <td style={{ ...tdS(), color: GRAY_M, fontSize: 11 }}>{d.source}</td>
                          <td style={{ ...tdS(), color: GRAY_M, fontSize: 11, maxWidth: 260 }}>{d.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard({ data, role, onLogout }) {
  const deals = data?.deals ?? defaultDeals;
  const nurture = data?.nurture ?? defaultNurture;
  const meta = data?.meta ?? defaultMeta;
  const [page, setPage] = useState(0);
  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 1060, margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: GRAY_M, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Vanterra Foundations</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>M&A Committee report</h1>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          {role === "admin" && (
            <a href="/admin" style={{ fontSize: 12, color: BLUE, textDecoration: "none", fontWeight: 500, padding: "4px 12px", border: `1px solid ${BLUE}`, borderRadius: 6 }}>Admin</a>
          )}
          {onLogout && (
            <button onClick={onLogout} style={{ fontSize: 12, color: GRAY_M, background: "none", border: `1px solid var(--color-border-secondary)`, borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>Logout</button>
          )}
          <div style={{ textAlign: "right", fontSize: 12, color: GRAY_M }}>
            <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{meta.weekLabel.replace("Week of ", "")}</div>
            <div>Confidential — do not distribute</div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 28, flexWrap: "wrap" }}>
        {pages.map((p, i) => (
          <button key={i} onClick={() => setPage(i)} style={{ padding: "9px 20px", border: "none", borderBottom: page === i ? `2px solid ${BLUE}` : "2px solid transparent", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: page === i ? 500 : 400, color: page === i ? BLUE : GRAY_M, marginBottom: -1 }}>{p}</button>
        ))}
      </div>
      {page === 0 && <Overview meta={meta} />}
      {page === 1 && <ActivePipeline deals={deals} meta={meta} />}
      {page === 2 && <Scorecard meta={meta} />}
      {page === 3 && <NTMForecast meta={meta} />}
      {page === 4 && <NurtureTracker nurture={nurture} meta={meta} />}
    </div>
  );
}
