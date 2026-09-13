import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { Users, Trophy, PenSquare, ListChecks, ClipboardCheck, ShieldCheck, UserCircle, LogIn, Swords, HeartHandshake } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ilmaQuest",
  description: "Islamic knowledge, made into a game.",
};

const REVIEWER_ROLES = ["reviewer", "senior_reviewer", "admin"];
const CONTRIBUTOR_ROLES = ["contributor", "reviewer", "senior_reviewer", "admin"];

const navLinkClass =
  "inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    role = profile?.role ?? null;
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <a href="/" className="text-lg font-semibold tracking-tight text-primary">
              ilmaQuest
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/join" className={navLinkClass}>
                <Users size={16} />
                Join
              </a>
              {user && (
                <>
                  <a href="/host" className={navLinkClass}>
                    <Trophy size={16} />
                    Host
                  </a>
                  <a href="/challenges" className={navLinkClass}>
                    <Swords size={16} />
                    Challenges
                  </a>
                  <a href="/support" className={navLinkClass}>
                    <HeartHandshake size={16} />
                    Support us
                  </a>
                </>
              )}
              {role && CONTRIBUTOR_ROLES.includes(role) && (
                <>
                  <a href="/contribute" className={navLinkClass}>
                    <PenSquare size={16} />
                    Contribute
                  </a>
                  <a href="/my-questions" className={navLinkClass}>
                    <ListChecks size={16} />
                    My questions
                  </a>
                </>
              )}
              {role && REVIEWER_ROLES.includes(role) && (
                <a href="/review" className={navLinkClass}>
                  <ClipboardCheck size={16} />
                  Review
                </a>
              )}
              {role === "admin" && (
                <a href="/admin/users" className={navLinkClass}>
                  <ShieldCheck size={16} />
                  Users
                </a>
              )}
              {user ? (
                <a href="/account" className={navLinkClass}>
                  <UserCircle size={16} />
                  Account
                </a>
              ) : (
                <a href="/login" className={navLinkClass}>
                  <LogIn size={16} />
                  Sign in
                </a>
              )}
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
