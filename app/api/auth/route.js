import { NextResponse } from "next/server"

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")

  if (!key) {
    return NextResponse.json({ error: "Key required" }, { status: 400 })
  }

  const readKey = process.env.READ_KEY
  const adminKey = process.env.ADMIN_KEY

  if (!readKey || !adminKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 })
  }

  if (key === adminKey) {
    return NextResponse.json({ role: "admin" })
  }

  if (key === readKey) {
    return NextResponse.json({ role: "viewer" })
  }

  return NextResponse.json({ error: "Invalid key" }, { status: 401 })
}
