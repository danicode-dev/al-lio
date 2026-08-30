import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies">
      <p>
        AL-LÍO usa <strong>solo cookies técnicas necesarias</strong> para que la plataforma funcione. No hay cookies
        opcionales, ni analítica de terceros, ni publicidad, ni rastreo. Por eso no verás un panel de consentimiento con
        opciones: no hay nada que aceptar o rechazar.
      </p>

      <h2>Qué cookies usamos</h2>
      <ul>
        <li>
          <strong>Sesión</strong> — mantiene tu cuenta iniciada mientras usas la plataforma. Se borra al cerrar sesión o al
          caducar.
        </li>
        <li>
          <strong>Preferencia de interfaz</strong> — recuerda si tienes la barra lateral contraída. No identifica a nadie.
        </li>
      </ul>

      <h2>Almacenamiento local</h2>
      <p>
        Guardamos algunas preferencias en el almacenamiento local de tu navegador (por ejemplo, que ya has visto este aviso).
        Esta información no sale de tu dispositivo.
      </p>

      <h2>Cómo eliminarlas</h2>
      <p>
        Puedes borrar las cookies y el almacenamiento local desde los ajustes de tu navegador en cualquier momento. Si lo
        haces, tendrás que volver a iniciar sesión.
      </p>
    </LegalPage>
  );
}
