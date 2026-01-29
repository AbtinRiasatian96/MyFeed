import { NextRequest, NextResponse } from "next/server";
import { getAllItems, addItem } from "@/lib/db";
import { fetchMetadata } from "@/lib/metadata";

export async function GET() {
  const items = getAllItems();
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const metadata = await fetchMetadata(url);
  const item = addItem(
    url,
    metadata.title,
    metadata.description,
    metadata.image,
    metadata.source
  );

  return NextResponse.json(item, { status: 201 });
}
