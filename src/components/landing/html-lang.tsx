"use client";

import { useEffect } from "react";

// The root layout ships <html lang="es">. The English landing routes set
// it to "en" on mount so assistive tech reads the page in the right
// language; the ES routes reset it back.
export function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
