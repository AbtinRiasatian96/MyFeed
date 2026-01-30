import { NextRequest, NextResponse } from "next/server";
import { toggleRead, deleteItem } from "@/lib/db";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await toggleRead(Number(id));
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new Response(JSON.stringify(item), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteItem(Number(id));
  return NextResponse.json({ ok: true });
}
