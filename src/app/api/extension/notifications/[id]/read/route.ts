import { authenticateExtensionRequest } from "@/lib/extension/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authenticateExtensionRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 401 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.userId); // scoped explicitly, not just trusting the id

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
