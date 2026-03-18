import { NextResponse } from "next/server"
import { put, list, del } from "@vercel/blob"

const MAX_REVISIONS = 52

function verifyAdmin(request) {
  const key = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!key || key !== process.env.ADMIN_KEY) return null
  return key
}

function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return null
  return token
}

// POST /api/upload — publish new data (or replace an existing revision)
export async function POST(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const blobToken = getBlobToken()
  if (!blobToken) {
    return NextResponse.json({ error: "Blob storage not configured" }, { status: 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { deals, nurture, meta, label, replaceRevision } = body
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
  const revisionLabel = label || ""

  // Metadata stored alongside the data in the revision
  const envelope = { data, label: revisionLabel, timestamp }

  try {
    // Write current data.json
    await put("data.json", JSON.stringify(data), {
      access: "private",
      addRandomSuffix: false,
      token: blobToken,
    })

    if (replaceRevision) {
      // Replace an existing revision — delete old, write to same path
      try {
        const { blobs } = await list({ prefix: replaceRevision, limit: 1, token: blobToken })
        if (blobs.length > 0) {
          await del(blobs[0].url, { token: blobToken })
        }
      } catch { /* if delete fails, still write the new one */ }

      await put(replaceRevision, JSON.stringify(envelope), {
        access: "private",
        addRandomSuffix: false,
        token: blobToken,
      })
    } else {
      // New revision
      await put(`revisions/${timestamp}.json`, JSON.stringify(envelope), {
        access: "private",
        addRandomSuffix: false,
        token: blobToken,
      })

      // Trim old revisions beyond MAX_REVISIONS
      try {
        const { blobs } = await list({ prefix: "revisions/", token: blobToken })
        const sorted = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        const toDelete = sorted.slice(MAX_REVISIONS)
        for (const blob of toDelete) {
          await del(blob.url, { token: blobToken })
        }
      } catch { /* cleanup is best-effort */ }
    }

    return NextResponse.json({ success: true, timestamp })
  } catch (err) {
    console.error("Blob upload error:", err.message, err.stack)
    return NextResponse.json({ error: `Failed to save data: ${err.message}` }, { status: 500 })
  }
}

// GET /api/upload — list revisions, or fetch a specific revision by ?pathname=
export async function GET(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const blobToken = getBlobToken()
  if (!blobToken) {
    return NextResponse.json({ revisions: [] })
  }

  const { searchParams } = new URL(request.url)
  const fetchPathname = searchParams.get("fetch")

  // Fetch a specific revision's data (used by rollback/label-edit)
  if (fetchPathname) {
    try {
      const { blobs } = await list({ prefix: fetchPathname, limit: 1, token: blobToken })
      if (blobs.length === 0) {
        return NextResponse.json({ error: "Revision not found" }, { status: 404 })
      }
      const res = await fetch(blobs[0].downloadUrl, {
        headers: { Authorization: `Bearer ${blobToken}` },
      })
      if (!res.ok) throw new Error("Failed to download revision")
      const envelope = await res.json()
      return NextResponse.json(envelope)
    } catch (err) {
      return NextResponse.json({ error: `Failed to fetch revision: ${err.message}` }, { status: 500 })
    }
  }

  // List all revisions
  try {
    const { blobs } = await list({ prefix: "revisions/", token: blobToken })
    const revisions = await Promise.all(
      blobs
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .slice(0, MAX_REVISIONS)
        .map(async (b) => {
          let label = ""
          try {
            const res = await fetch(b.downloadUrl, {
              headers: { Authorization: `Bearer ${blobToken}` },
            })
            if (res.ok) {
              const envelope = await res.json()
              label = envelope.label || ""
            }
          } catch { /* ignore */ }
          return {
            pathname: b.pathname,
            timestamp: b.uploadedAt,
            size: b.size,
            label,
          }
        })
    )
    return NextResponse.json({ revisions })
  } catch (err) {
    console.error("List revisions error:", err.message)
    return NextResponse.json({ revisions: [] })
  }
}

// DELETE /api/upload — delete a specific revision
export async function DELETE(request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const blobToken = getBlobToken()
  if (!blobToken) {
    return NextResponse.json({ error: "Blob storage not configured" }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const pathname = searchParams.get("pathname")
  if (!pathname || !pathname.startsWith("revisions/")) {
    return NextResponse.json({ error: "Invalid revision pathname" }, { status: 400 })
  }

  try {
    const { blobs } = await list({ prefix: pathname, limit: 1, token: blobToken })
    if (blobs.length === 0) {
      return NextResponse.json({ error: "Revision not found" }, { status: 404 })
    }
    await del(blobs[0].url, { token: blobToken })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Delete revision error:", err.message)
    return NextResponse.json({ error: "Failed to delete revision" }, { status: 500 })
  }
}
