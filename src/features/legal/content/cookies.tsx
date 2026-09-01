import type { LegalDocument } from "../types";

export const cookiesDocument: LegalDocument = {
  es: {
    metadataTitle: "Cookies",
    href: "/cookies",
    altHref: "/en/cookies",
    title: "Política de cookies",
    kicker: "Cookies",
    lead: (
      <>
        AL-LÍO usa <strong>solo cookies técnicas necesarias</strong> para que la plataforma funcione. No hay cookies
        opcionales, ni analítica de terceros, ni publicidad, ni rastreo.
      </>
    ),
    aside: (
      <>
        <p className="al-aside-title">Sin panel de consentimiento</p>
        <p>No hay nada que aceptar o rechazar: por eso no verás una ventana pidiéndote permiso para instalar cookies.</p>
      </>
    ),
    children: (
      <>
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
          Guardamos algunas preferencias en el almacenamiento local de tu navegador (por ejemplo, que ya has visto el aviso de
          cookies). Esta información no sale de tu dispositivo.
        </p>

        <h2>Cómo eliminarlas</h2>
        <p>
          Puedes borrar las cookies y el almacenamiento local desde los ajustes de tu navegador en cualquier momento. Si lo
          haces, tendrás que volver a iniciar sesión.
        </p>
      </>
    ),
  },
  en: {
    metadataTitle: "Cookies",
    href: "/en/cookies",
    altHref: "/cookies",
    title: "Cookie policy",
    kicker: "Cookies",
    lead: (
      <>
        AL-LÍO uses <strong>only the strictly necessary technical cookies</strong> for the platform to work. There are no
        optional cookies, no third-party analytics, no advertising and no tracking.
      </>
    ),
    aside: (
      <>
        <p className="al-aside-title">No consent banner</p>
        <p>There is nothing to accept or reject, so you won’t see a window asking permission to install cookies.</p>
      </>
    ),
    children: (
      <>
        <h2>Which cookies we use</h2>
        <ul>
          <li>
            <strong>Session</strong> — keeps you signed in while you use the platform. It is cleared when you sign out or when
            it expires.
          </li>
          <li>
            <strong>Interface preference</strong> — remembers whether your sidebar is collapsed. It does not identify anyone.
          </li>
        </ul>

        <h2>Local storage</h2>
        <p>
          We save a few preferences in your browser’s local storage (for example, that you have already seen the cookie
          notice). This information never leaves your device.
        </p>

        <h2>How to remove them</h2>
        <p>
          You can clear cookies and local storage from your browser settings at any time. If you do, you will have to sign in
          again.
        </p>
      </>
    ),
  },
};
