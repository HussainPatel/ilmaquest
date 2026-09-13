export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center">
      <div className="rounded-full bg-danger/10 p-3 text-2xl">⚠️</div>
      <h1 className="mt-4 text-xl font-semibold">Sign-in link didn&apos;t work</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The link may have expired or already been used. Please{" "}
        <a href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
          request a new one
        </a>
        .
      </p>
    </main>
  );
}
