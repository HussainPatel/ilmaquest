"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["player", "contributor", "reviewer", "senior_reviewer", "admin"];

export default function RoleSelect({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(newRole: string) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not update role.");
      setBusy(false);
      return;
    }
    setRole(newRole);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={role}
        disabled={disabled || busy}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium capitalize outline-none focus:border-primary disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r.replace("_", " ")}
          </option>
        ))}
      </select>
      {disabled && <span className="text-xs text-muted-foreground">that&apos;s you</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
