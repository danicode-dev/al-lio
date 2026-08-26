const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const routes = ["/", "/dashboard", "/calendar", "/work", "/courses", "/hackathons", "/noticias", "/register", "/recuperar"];
const appMarkers = ["AL-L", "AL L", "__next", "/_next/static"];

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
  const text = await response.text();

  if (response.status >= 500) {
    throw new Error(`${path} devuelve HTTP ${response.status}`);
  }

  return { response, text };
}

for (const route of routes) {
  const { response, text } = await fetchText(route);
  if (!appMarkers.some((marker) => text.includes(marker))) {
    throw new Error(`${route} no parece renderizar una pagina de la app`);
  }
  console.log(`OK: ${route} -> HTTP ${response.status}`);
}

const dashboard = await fetchText("/dashboard");
const cssLinks = [...dashboard.text.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((match) => match[1]);

if (cssLinks.length === 0) {
  throw new Error("No se ha encontrado ningun CSS en /dashboard");
}

for (const href of cssLinks) {
  const url = href.startsWith("http") ? href : `${baseUrl}${href}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CSS no carga: ${url} -> HTTP ${response.status}`);
  }
}

console.log("OK: humo local completado, rutas y CSS cargan.");
