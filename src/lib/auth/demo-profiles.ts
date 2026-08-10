export const DEMO_PROFILES = [
  {
    key: "development",
    userId: "10000000-0000-0000-0000-000000000001",
    email: "demo.dev@al-lio.test",
    title: "Desarrollo Web",
    detail: "DAW · 2.º curso",
    initials: "DW",
  },
  {
    key: "finance",
    userId: "10000000-0000-0000-0000-000000000002",
    email: "demo.af@al-lio.test",
    title: "Administración y Finanzas",
    detail: "AF · 1.er curso",
    initials: "AF",
  },
  {
    key: "fitness",
    userId: "10000000-0000-0000-0000-000000000003",
    email: "demo.tsaf@al-lio.test",
    title: "Acondicionamiento Físico",
    detail: "TSAF · 1.er curso",
    initials: "TF",
  },
  {
    key: "marketing",
    userId: "10000000-0000-0000-0000-000000000004",
    email: "demo.mp@al-lio.test",
    title: "Marketing y Publicidad",
    detail: "MP · 2.º curso",
    initials: "MP",
  },
] as const;

export type DemoProfile = (typeof DEMO_PROFILES)[number];

export function getDemoProfile(value: unknown): DemoProfile | null {
  if (typeof value !== "string") return null;
  return DEMO_PROFILES.find((profile) => profile.key === value) ?? null;
}
