import { PUBLIC_CONTACT_EMAILS } from "@/lib/public-contact";

import { LEGAL_ROUTES } from "../routes";
import type { LegalDocument } from "../types";

export const privacyDocument: LegalDocument = {
  es: {
    ...LEGAL_ROUTES.privacy.es,
    lead: "AL-LÍO es una plataforma para estudiantes de Formación Profesional. Tratamos los datos mínimos para que la herramienta funcione y no compartimos tu información con terceros con fines comerciales.",
    aside: (
      <>
        <p className="al-aside-title">Qué no hacemos</p>
        <p>
          No vendemos ni cedemos tus datos con fines comerciales, no hacemos perfiles publicitarios y no hay analítica de
          terceros, publicidad ni redes sociales embebidas. Google entra solo si eliges iniciar sesión o sincronizar tu
          calendario con esa cuenta.
        </p>
      </>
    ),
    children: (
      <>
        <h2>Qué datos guardamos</h2>
        <ul>
          <li>Tu correo electrónico y, si te registras con Google, tu nombre público.</li>
          <li>Tu ciclo formativo, para ajustar los contenidos que ves.</li>
          <li>El contenido que creas en la plataforma: tareas, notas, favoritos, progreso de cursos.</li>
          <li>Datos técnicos imprescindibles: la sesión y tu preferencia de barra lateral.</li>
        </ul>

        <h2>Para qué los usamos</h2>
        <p>
          Únicamente para prestar el servicio: identificarte, mostrarte lo que corresponde a tu ciclo, guardar tu trabajo y
          mantener la sesión iniciada.
        </p>

        <h2>Base legal</h2>
        <p>
          El tratamiento se basa en la ejecución del servicio que solicitas al crear tu cuenta y en tu consentimiento. Puedes
          retirarlo en cualquier momento eliminando tu cuenta.
        </p>

        <h2>Conservación</h2>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Si la eliminas, borramos tu información salvo lo que debamos
          conservar por obligación legal.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes acceder, rectificar, suprimir, limitar u oponerte al tratamiento de tus datos, y solicitar su portabilidad.
          Escríbenos a{" "}
          <a href={"mailto:" + PUBLIC_CONTACT_EMAILS.privacy}><strong>{PUBLIC_CONTACT_EMAILS.privacy}</strong></a>. También
          puedes reclamar ante la{" "}
          <a href="https://www.aepd.es" target="_blank" rel="noreferrer">Agencia Española de Protección de Datos</a>.
        </p>

        <h2>Terceros</h2>
        <p>
          Usamos <a href="https://www.google.com/policies/privacy/" target="_blank" rel="noreferrer">Google</a> solo si eliges
          iniciar sesión o sincronizar tu calendario con esa cuenta, y con el alcance mínimo necesario. No hay analítica de
          terceros, publicidad ni redes sociales embebidas.
        </p>
      </>
    ),
  },
  en: {
    ...LEGAL_ROUTES.privacy.en,
    lead: "AL-LÍO is a platform for vocational-training students. We handle the minimum data needed for the tool to work and we do not share your information with third parties for commercial purposes.",
    aside: (
      <>
        <p className="al-aside-title">What we don’t do</p>
        <p>
          We don’t sell or share your data for commercial purposes, we don’t build advertising profiles, and there is no
          third-party analytics, advertising or embedded social media. Google is only involved if you choose to sign in or
          sync your calendar with that account.
        </p>
      </>
    ),
    children: (
      <>
        <h2>What data we store</h2>
        <ul>
          <li>Your email address and, if you register with Google, your public name.</li>
          <li>Your training programme, so we can tailor the content you see.</li>
          <li>The content you create on the platform: tasks, notes, favourites, course progress.</li>
          <li>Essential technical data: your session and your sidebar preference.</li>
        </ul>

        <h2>What we use it for</h2>
        <p>
          Only to provide the service: to identify you, show you what matches your programme, save your work and keep you
          signed in.
        </p>

        <h2>Legal basis</h2>
        <p>
          Processing is based on delivering the service you request when you create your account and on your consent. You can
          withdraw it at any time by deleting your account.
        </p>

        <h2>Retention</h2>
        <p>
          We keep your data while your account is active. If you delete it, we erase your information except for what we are
          legally required to keep.
        </p>

        <h2>Your rights</h2>
        <p>
          You can access, rectify, erase, restrict or object to the processing of your data, and request its portability.
          Write to us at{" "}
          <a href={"mailto:" + PUBLIC_CONTACT_EMAILS.privacy}><strong>{PUBLIC_CONTACT_EMAILS.privacy}</strong></a>. You can
          also lodge a complaint with the{" "}
          <a href="https://www.aepd.es" target="_blank" rel="noreferrer">Spanish Data Protection Agency</a>.
        </p>

        <h2>Third parties</h2>
        <p>
          We use <a href="https://www.google.com/policies/privacy/" target="_blank" rel="noreferrer">Google</a> only if you
          choose to sign in or sync your calendar with that account, and with the minimum scope needed. There is no
          third-party analytics, advertising or embedded social media.
        </p>
      </>
    ),
  },
};
