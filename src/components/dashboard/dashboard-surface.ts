import type { CSSProperties } from "react";

type CssVariables = CSSProperties & Record<`--${string}`, string>;

// Las piezas heredadas (tareas y calendario) usan los tokens de shadcn.
// Al vivir sobre una tarjeta clara, fijamos esos tokens localmente para que
// mantengan contraste también cuando la aplicación está en tema oscuro.
export const dashboardLightSurface: CssVariables = {
  "--background": "42 30% 97%",
  "--foreground": "220 14% 12%",
  "--card": "0 0% 100%",
  "--card-foreground": "220 14% 12%",
  "--primary": "214 84% 38%",
  "--primary-foreground": "0 0% 100%",
  "--muted": "210 18% 92%",
  "--muted-foreground": "220 9% 38%",
  "--border": "214 15% 84%",
};
