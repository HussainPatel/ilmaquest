import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import RoleSelect from "./role-select";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/users");
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account role is <strong>{profile?.role ?? "unknown"}</strong>.
        </p>
      </main>
    );
  }

  // users_select_own RLS only lets a normal client see its own row — listing
  // everyone requires the service client. Safe here: we've already verified
  // the caller is admin above, using their own session.
  const service = createServiceClient();
  const { data: users } = await service
    .from("users")
    .select("id, display_name, email, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage roles — see docs/CONTENT_PROCESS.md §3 for what each role can do.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {users?.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="text-sm font-medium">{u.display_name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
            <RoleSelect userId={u.id} currentRole={u.role} disabled={u.id === user.id} />
          </div>
        ))}
      </div>
    </main>
  );
}
