// The one pending affordance for auth / onboarding submit buttons (issue
// #373): a spinner plus its label, so every form's "working" state reads the
// same and a screen reader hears the label rather than only a spinning
// graphic. `.al-spinner` (globals.css) carries the animation and honours
// prefers-reduced-motion.
export function Spinner({ label }: { label: string }) {
  return (
    <>
      <svg className="al-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
        <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label}
    </>
  );
}
