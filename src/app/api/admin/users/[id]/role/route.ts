import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

const VALID_ROLES = ["player", "contributor", "reviewer", "senior_reviewer", "admin"];

// Role changes are explicitly blocked for everyone except the service role
// (see prevent_role_self_change trigger in 20260823010100_users.sql) — this
// is the one sanctioned path. We verify the CALLER is an admin using their
// own authenticated session first, then use the service client (which the
// trigger recognizes as auth.role() = 'service_role') to actually write it.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { role } = await request.json();
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.from("users").update({ role }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
