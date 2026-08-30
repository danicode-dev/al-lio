import Image from "next/image";
import Link from "next/link";
import { Github } from "lucide-react";

// Shared footer for the landing and every legal page: the mark, the
// required Aircury SL credit + the open-source (MIT) link, and two short
// link columns. One flowing row on desktop, stacked on a phone.
export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-[#E8E1D2]">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-6 py-10 text-[12px] sm:px-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-[34ch]">
          <Image src="/assets/al_lio_logo_horizontal.png" alt="AL-LÍO" width={2172} height={724} className="h-6 w-auto" />
          <p className="mt-3 leading-relaxed text-[#77726a]">
            Proyecto desarrollado gracias a la beca Aircury Summer of Code 2026 de{" "}
            <a
              href="https://www.aircury.es"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#55514a] underline underline-offset-2 hover:text-[#17150f]"
            >
              Aircury SL
            </a>
            .
          </p>
          <a
            href="https://github.com/danielgarciaortega-dev/al-lio"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[#55514a] hover:text-[#17150f]"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            Código abierto en GitHub · MIT
          </a>
        </div>

        <div className="flex gap-12">
          <div>
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a958a]">Producto</p>
            <ul className="space-y-2 text-[#55514a]">
              <li><Link href="/#panel" className="hover:text-[#17150f]">Cómo funciona</Link></li>
              <li><Link href="/proyecto" className="hover:text-[#17150f]">El proyecto</Link></li>
              <li><Link href="/login" className="hover:text-[#17150f]">Iniciar sesión</Link></li>
              <li><Link href="/register" className="hover:text-[#17150f]">Crear cuenta</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a958a]">Legal</p>
            <ul className="space-y-2 text-[#55514a]">
              <li><Link href="/privacidad" className="hover:text-[#17150f]">Privacidad</Link></li>
              <li><Link href="/cookies" className="hover:text-[#17150f]">Cookies</Link></li>
              <li><Link href="/terminos" className="hover:text-[#17150f]">Términos</Link></li>
              <li><Link href="/accesibilidad" className="hover:text-[#17150f]">Accesibilidad</Link></li>
              <li><Link href="/contacto" className="hover:text-[#17150f]">Contacto</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
