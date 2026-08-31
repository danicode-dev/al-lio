import { SettingsFeature } from "@/features/settings";
import { requireAdminUser } from "@/lib/auth/authorization";

export default async function SettingsPage() {
  await requireAdminUser();
  return <SettingsFeature />;
}
