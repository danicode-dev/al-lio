import { GuestApp, type View } from "@/components/guest-app";

export function StoredGuestApp({ view }: { view: Exclude<View, "dashboard"> }) {
  return <GuestApp view={view} />;
}
