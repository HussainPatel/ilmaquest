import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConnectExtension from "./connect-extension";

export default async function ExtensionConnectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/extension/connect");
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">Connect the extension</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate a code, then paste it into the ilmaQuest browser extension popup.
      </p>
      <ConnectExtension />
    </main>
  );
}
