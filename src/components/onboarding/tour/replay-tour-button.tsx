"use client";

import { useTransition } from "react";
import { Compass } from "lucide-react";

import { resetProductTourAction } from "@/lib/onboarding/tour-actions";

// "Repeat the tour" from the profile. Resetting only rewinds the caller's own
// tour state - it never touches anything the student has since created.
//
// Whether the tour exists at all is decided on the server, in the dashboard
// layout: a student who had already finished it is not served the tour shell,
// so there is nothing on the page for a client-side router push to wake up.
// That is why this leaves through a full document navigation instead of
// router.push + refresh - the layout has to run again for the reset to mean
// anything, and the App Router can legitimately serve the dashboard from its
// client cache.
export function ReplayTourButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="al-action-soft inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-extrabold transition disabled:opacity-60"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await resetProductTourAction();
          window.location.assign("/dashboard");
        })
      }
    >
      <Compass className="h-4 w-4" />
      {pending ? "Preparando…" : "Repetir el recorrido"}
    </button>
  );
}
