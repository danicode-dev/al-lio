import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = { title: "Privacidad", alternates: { canonical: "/privacidad", languages: { es: "/privacidad", en: "/en/privacidad" } } };

export default function PrivacidadPage() {
  return (
    <LegalPage
      lang="es"
      altHref="/en/privacidad"
      title="Privacidad"
      kicker="Protección de datos"
      lead="AL-LÍO es una plataforma para estudiantes de Formación Profesional. Tratamos los datos mínimos para que la herramienta funcione y no compartimos tu información con terceros con fines comerciales."
      aside={
        <>
          <p className="al-aside-title">Qué no hacemos</p>
          <p>
            No vendemos ni cedemos tus datos con fines comerciales, no hacemos perfiles publicitarios y no hay analítica de
            terceros, publicidad ni redes sociales embebidas. Google entra solo si eliges iniciar sesión o sincronizar tu
            calendario con esa cuenta.
          </p>
        </>
      }
    >
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
        Escríbenos a <strong>[correo del proyecto]</strong>. También puedes reclamar ante la{" "}
        <a href="https://www.aepd.es" target="_blank" rel="noreferrer">Agencia Española de Protección de Datos</a>.
      </p>

      <h2>Terceros</h2>
      <p>
        Usamos <a href="https://www.google.com/policies/privacy/" target="_blank" rel="noreferrer">Google</a> solo si eliges
        iniciar sesión o sincronizar tu calendario con esa cuenta, y con el alcance mínimo necesario. No hay analítica de
        terceros, publicidad ni redes sociales embebidas.
      </p>
    </LegalPage>
  );
}
