import type { CSSProperties } from "react";

type CssVariables = CSSProperties & Record<`--${string}`, string>;

// Historical task and calendar surfaces use shadcn tokens. Pin those tokens
// locally on the light card so legacy system preferences cannot reduce
// contrast even though AL-LIO currently presents a light-only interface.
export const dashboardLightSurface: CssVariables = {
  "--background": "42 30% 97%",
  "--foreground": "220 14% 12%",
  "--card": "0 0% 100%",
  "--card-foreground": "220 14% 12%",
  "--primary": "16 86% 58%",
  "--primary-foreground": "0 0% 100%",
  "--muted": "210 18% 92%",
  "--muted-foreground": "220 9% 38%",
  "--border": "214 15% 84%",
  "--ring": "16 86% 58%",
};
