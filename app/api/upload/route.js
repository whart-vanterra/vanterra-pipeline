import { NextResponse } from "next/server"
import { put, list } from "@vercel/blob"

export async function POST(request) {
  const authHeader = request.headers.get("authorization")
  const key = authHeader?.replace("Bearer ", "")

  if (!key || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) {
    return NextResponse.json({ error: "Blob storage not configured" }, { status: 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { deals, nurture, meta } = body
  if (!deals || !Array.isArray(deals)) {
    return NextResponse.json({ error: "Missing or invalid deals array" }, { status: 400 })
  }
  if (!nurture || !Array.isArray(nurture)) {
    return NextResponse.json({ error: "Missing or invalid nurture array" }, { status: 400 })
  }
  if (!meta || typeof meta !== "object") {
    return NextResponse.json({ error: "Missing or invalid meta object" }, { status: 400 })
  }

  const data = { deals, nurture, meta }
  const timestamp = new Date().toISOString()

  try {
    await put("data.json", JSON.stringify(data), {
      access: "public",
      addRandomSuffix: false,
      token: blobToken,
    })

    await put(`revisions/${timestamp}.json`, JSON.stringify(data), {
      access: "public",
      addRandomSuffix: false,
      token: blobToken,
    })

    return NextResponse.json({ success: true, timestamp })
  } catch (err) {
    console.error("Blob upload error:", err.message)
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 })
  }
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization")
  const key = authHeader?.replace("Bearer ", "")

  if (!key || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) {
    return NextResponse.json({ revisions: [] })
  }

  try {
    const { blobs } = await list({ prefix: "revisions/", token: blobToken })
    const revisions = blobs
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 5)
      .map((b) => ({
        url: b.url,
        pathname: b.pathname,
        timestamp: b.uploadedAt,
        size: b.size,
      }))
    return NextResponse.json({ revisions })
  } catch (err) {
    console.error("List revisions error:", err.message)
    return NextResponse.json({ revisions: [] })
  }
}
