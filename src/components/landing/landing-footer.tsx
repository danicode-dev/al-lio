import Image from "next/image";
import Link from "next/link";
import { Github } from "lucide-react";

// Shared footer for the landing and every legal page: the mark, the
// required Aircury SL credit + the open-source (MIT) link, and two short
// link columns. One flowing row on desktop, stacked on a phone.
export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-[#E6DED2]">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-6 py-12 text-[14px] sm:px-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-[36ch]">
          <Image src="/assets/al_lio_wordmark.png" alt="AL-LÍO" width={354} height={96} className="h-6 w-auto" />
          <p className="mt-3 leading-relaxed text-[#7A736B]">
            Proyecto desarrollado gracias a la beca Aircury Summer of Code 2026 de{" "}
            <a
              href="https://www.aircury.es"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#4D4842] underline underline-offset-2 hover:text-[#2F2A24]"
            >
              Aircury SL
            </a>
            .
          </p>
          <a
            href="https://github.com/danielgarciaortega-dev/al-lio"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[#4D4842] hover:text-[#2F2A24]"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            Código abierto en GitHub · MIT
          </a>
        </div>

        <div className="flex gap-12">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7A736B]">Producto</p>
            <ul className="space-y-2.5 text-[#4D4842]">
              <li><Link href="/#panel" className="hover:text-[#2F2A24]">Cómo funciona</Link></li>
              <li><Link href="/proyecto" className="hover:text-[#2F2A24]">El proyecto</Link></li>
              <li><Link href="/login" className="hover:text-[#2F2A24]">Entrar</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7A736B]">Legal</p>
            <ul className="space-y-2.5 text-[#4D4842]">
              <li><Link href="/privacidad" className="hover:text-[#2F2A24]">Privacidad</Link></li>
              <li><Link href="/cookies" className="hover:text-[#2F2A24]">Cookies</Link></li>
              <li><Link href="/terminos" className="hover:text-[#2F2A24]">Términos</Link></li>
              <li><Link href="/accesibilidad" className="hover:text-[#2F2A24]">Accesibilidad</Link></li>
              <li><Link href="/contacto" className="hover:text-[#2F2A24]">Contacto</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
