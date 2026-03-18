import XLSX from "xlsx"
import { dealsColumns, nurtureColumns } from "../lib/schema.js"

const dealsHeaders = dealsColumns.map((c) => c.label)
const nurtureHeaders = nurtureColumns.map((c) => c.label)

const dealsSample = [
  ["Acme Foundation Co.", "Broker", "Dallas", "TX", 8.5, 30, 90, "Engaged", "on-track", "Initial meeting scheduled"],
  ["Example Waterproofing", "Proprietary", "Atlanta", "GA", 5.0, null, null, "Owner Conv.", "on-track", "Owner expressed interest"],
]

const nurtureSample = [
  ["Sample Repair Co.", "NDA Signed", "FL", "Southeast", 12.0, 2.0, 17, "Broker", 120, "Staying in touch", false],
  ["Demo Basement Systems", "Engaged", "OH", "Midwest", 6.0, null, null, "Proprietary", 45, "Follow-up scheduled", false],
]

const wb = XLSX.utils.book_new()

const dealsData = [dealsHeaders, ...dealsSample]
const dealsWs = XLSX.utils.aoa_to_sheet(dealsData)
dealsWs["!cols"] = dealsHeaders.map(() => ({ wch: 20 }))
XLSX.utils.book_append_sheet(wb, dealsWs, "Deals")

const nurtureData = [nurtureHeaders, ...nurtureSample]
const nurtureWs = XLSX.utils.aoa_to_sheet(nurtureData)
nurtureWs["!cols"] = nurtureHeaders.map(() => ({ wch: 18 }))
XLSX.utils.book_append_sheet(wb, nurtureWs, "Nurture")

XLSX.writeFile(wb, "public/template.xlsx")
console.log("Template written to public/template.xlsx")
