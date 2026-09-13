import { authenticateExtensionRequest } from "@/lib/extension/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

// Polled by the extension's background service worker (~every 15 min, see
// docs/ARCHITECTURE.md). Uses the service client because the extension has
// no cookie session for RLS to key off — authenticateExtensionRequest
// already resolved the token to a specific userId, and every query below
// is explicitly scoped to it as defense in depth.
export async function GET(request: Request) {
  const auth = await authenticateExtensionRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: notifications } = await service
    .from("notifications")
    .select("id, type, payload, read_at, created_at")
    .eq("user_id", auth.userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ notifications: notifications ?? [] });
}
