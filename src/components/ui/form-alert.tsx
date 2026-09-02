"use client";

import { useEffect, useRef } from "react";

// One accessible error surface for every auth / onboarding form (issue #373).
// It is announced via role="alert", and focus moves to it the moment it
// appears so a keyboard or screen-reader user is taken to the problem instead
// of being left on the submit button. Renders nothing when there is no
// message. The visual treatment is `.al-form-alert` in globals.css (the #362
// semantic error tokens).
export function FormAlert({ message }: { message?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);

  if (!message) return null;

  return (
    <div ref={ref} role="alert" tabIndex={-1} className="al-form-alert">
      {message}
    </div>
  );
}
