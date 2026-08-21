import { StoredGuestApp } from "@/components/stored-guest-app";
import { requireAdminUser } from "@/lib/auth/authorization";

export default async function SettingsPage() {
  await requireAdminUser();
  return <StoredGuestApp view="settings" />;
}
