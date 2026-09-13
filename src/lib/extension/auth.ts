import { createServiceClient } from "@/lib/supabase/service";
import { hashToken } from "./token";

// Every /api/extension/* route calls this first. The extension has no
// cookie session, so it sends "Authorization: Bearer iq_..." instead — we
// hash it and look it up via the service client (RLS on extension_tokens
// is for the web app's own account UI, not this path).
export async function authenticateExtensionRequest(
  request: Request
): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("extension_tokens")
    .select("id, user_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!data) return null;

  await service
    .from("extension_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { userId: data.user_id };
}
