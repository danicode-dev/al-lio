const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const routes = ["/", "/dashboard", "/calendar", "/work"];

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
  if (!text.includes("D1OS") && !text.includes("TechLife")) {
    throw new Error(`${route} no parece renderizar la app D1OS`);
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
