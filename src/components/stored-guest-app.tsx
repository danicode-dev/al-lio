import { GuestApp, StoreProvider, type Store, type View } from "@/components/guest-app";
import { getGlobalStore } from "@/lib/data";

export async function StoredGuestApp({ view }: { view: Exclude<View, "dashboard"> }) {
  const store = (await getGlobalStore()) as unknown as Store;
  return (
    <StoreProvider initialStore={store}>
      <GuestApp view={view} />
    </StoreProvider>
  );
}
