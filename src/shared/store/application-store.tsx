"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { Store } from "@/components/store/types";

type ApplicationStoreContextValue = {
  store: Store;
  setStore: Dispatch<SetStateAction<Store>>;
  resetStore: () => void;
};

const ApplicationStoreContext = createContext<ApplicationStoreContextValue | null>(null);

export function useApplicationStore() {
  const context = useContext(ApplicationStoreContext);
  if (!context) throw new Error("useApplicationStore must be used within ApplicationStoreProvider");
  return context;
}

export function ApplicationStoreProvider({ initialStore, children }: { initialStore: Store; children: ReactNode }) {
  const [store, setStore] = useState(initialStore);
  const initialStoreRef = useRef(initialStore);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    initialStoreRef.current = initialStore;
    setStore(initialStore);
  }, [initialStore]);

  return (
    <ApplicationStoreContext.Provider
      value={{ store, setStore, resetStore: () => setStore(initialStoreRef.current) }}
    >
      {children}
    </ApplicationStoreContext.Provider>
  );
}
