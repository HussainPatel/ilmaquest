import { createClient } from "@/lib/supabase/server";
import { generateExtensionToken, hashToken } from "@/lib/extension/token";
import { NextResponse } from "next/server";

// Called from the logged-in web app (cookie session) to mint a new
// extension token. The raw token is returned exactly once here and never
// stored server-side — only its hash is, in extension_tokens.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const token = generateExtensionToken();
  const { error } = await supabase
    .from("extension_tokens")
    .insert({ user_id: user.id, token_hash: hashToken(token) });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ token });
}
