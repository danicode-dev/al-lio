import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.37a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.99-4.33 2.99-7.52z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.89 6.62-2.42l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.58-4.12H3.07v2.59A10 10 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.42 13.9a6 6 0 0 1 0-3.8V7.51H3.07a10 10 0 0 0 0 8.98l3.35-2.59z"
      />
      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.78.5 3.82 1.49l2.87-2.87C16.96 2.99 14.69 2 12 2a10 10 0 0 0-8.93 5.51l3.35 2.59C7.2 7.74 9.4 5.98 12 5.98z"
      />
    </svg>
  );
}

export function GoogleLoginButton({ className }: { className?: string }) {
  return (
    <Button
      asChild
      className={[
        "h-12 w-full rounded-md border bg-white text-slate-950 shadow-sm hover:bg-slate-50 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90",
        className,
      ].filter(Boolean).join(" ")}
    >
      <a href="/api/google/calendar/auth?next=/dashboard">
        <GoogleIcon />
        Continuar con Google
      </a>
    </Button>
  );
}
