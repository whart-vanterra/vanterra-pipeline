import { NextResponse } from "next/server"
import { list } from "@vercel/blob"
import { getDefaultData } from "../../../lib/data"

export async function GET(request) {
  const authHeader = request.headers.get("authorization")
  const key = authHeader?.replace("Bearer ", "")

  if (!key) {
    return NextResponse.json({ error: "Key required" }, { status: 401 })
  }

  const readKey = process.env.READ_KEY
  const adminKey = process.env.ADMIN_KEY

  if (key !== readKey && key !== adminKey) {
    return NextResponse.json({ error: "Invalid key" }, { status: 401 })
  }

  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN
    if (blobToken) {
      const { blobs } = await list({ prefix: "data.json", limit: 1, token: blobToken })
      if (blobs.length > 0) {
        // Private blobs require token-authenticated download
        const res = await fetch(blobs[0].downloadUrl, {
          headers: { Authorization: `Bearer ${blobToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data)
        }
      }
    }
  } catch (err) {
    console.error("Blob fetch error:", err.message)
  }

  return NextResponse.json(getDefaultData())
}
