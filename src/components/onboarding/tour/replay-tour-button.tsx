"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";

import { resetProductTourAction } from "@/lib/onboarding/tour-actions";

// "Repeat the tour" from the profile. Resetting only rewinds the caller's own
// tour state - it never touches the example task or note the previous run
// created, so a student can replay it without losing anything they kept.
export function ReplayTourButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      className="al-action-soft inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-extrabold transition disabled:opacity-60"
      disabled={pending || done}
      onClick={() =>
        startTransition(async () => {
          await resetProductTourAction();
          setDone(true);
          // The invitation is decided on the server in the dashboard layout,
          // so send the student there and let it re-render with the reset.
          router.push("/dashboard");
          router.refresh();
        })
      }
    >
      <Compass className="h-4 w-4" />
      {pending ? "Preparando…" : "Repetir el recorrido"}
    </button>
  );
}
