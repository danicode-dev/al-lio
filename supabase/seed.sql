create or replace function public.seed_hackathons_for_current_user()
returns void
language plpgsql
security invoker
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.hackathons (user_id, name, organizer, province, city, type, status, url, notes, priority)
  values
    (auth.uid(), 'SIDN Gen AI Arena', 'SIDN', 'Granada', 'Granada', 'hackathon', 'realizado', 'https://www.arenasidn.com/', 'Hackathon de IA aplicada a negocio y marketing. Revisar futuras ediciones.', 'alta'),
    (auth.uid(), 'Aircury Summer of Code', 'Aircury', 'Granada', 'Granada', 'beca', 'revisar_futura_edicion', 'https://granadev.es/summer-of-code.html', 'Becas para estudiantes de programacion y proyectos open source.', 'alta'),
    (auth.uid(), 'Hackathon Granada Salud', 'Andalucia Emprende / UGR / AI Granada', 'Granada', 'Granada', 'hackathon', 'revisar_futura_edicion', 'https://canal.ugr.es/convocatoria/hackathon-andalucia-emprende-granada-salud-2025/', 'Hackathon de IA, salud, FP y universidad.', 'alta'),
    (auth.uid(), 'Ideas Factory UGR', 'UGR Emprendedora', 'Granada', 'Granada', 'reto', 'pendiente', 'https://ideasfactory.es/ugr/', 'Programa para idear, validar y presentar proyectos.', 'media'),
    (auth.uid(), 'OpenSouthCode', 'OpenSouthCode', 'Malaga', 'Malaga', 'evento', 'pendiente', 'https://www.opensouthcode.org/conferences/opensouthcode2026', 'Evento de software libre y open source.', 'alta'),
    (auth.uid(), 'NASA Space Apps Malaga', 'NASA Space Apps / 42 Malaga', 'Malaga', 'Malaga', 'hackathon', 'revisar_futura_edicion', 'https://catedratelefonicauma.es/en/space-apps-challenge-2025/', 'Hackathon global con datos abiertos, ciencia, IA y visualizacion.', 'alta'),
    (auth.uid(), 'GeneracionFP Megahackathon', 'GeneracionFP', 'Malaga', 'Malaga', 'hackathon', 'revisar_futura_edicion', 'https://www.vidaeconomica.com/2025/10/hackathon-innovacion-social-digital-fp-malaga-2025/', 'Megahackathon de innovacion social digital para FP.', 'alta'),
    (auth.uid(), 'Talent & Job Hackathon UMA', 'Universidad de Malaga', 'Malaga', 'Malaga', 'hackathon', 'pendiente', 'https://talentank.uma.es/talent-and-job/', 'Hackathon de empleabilidad. Revisar si acepta externos a UMA.', 'media'),
    (auth.uid(), 'Reto Cosentino UAL', 'Cosentino / Universidad de Almeria', 'Almeria', 'Almeria', 'reto', 'revisar_futura_edicion', 'https://w3.ual.es/retoCosentino/', 'Reto intensivo con empresa real, mentoria y prototipo.', 'alta'),
    (auth.uid(), 'CIBER OLE Almeria', 'CIBER OLE / UAL', 'Almeria', 'Almeria', 'hackathon', 'revisar_futura_edicion', 'https://ciber-ole.eu/evento-almeria-2025', 'Ciberseguridad, emprendimiento e innovacion.', 'alta'),
    (auth.uid(), 'Hackathon UJA CyberChallenge', 'Universidad de Jaen', 'Jaen', 'Jaen', 'hackathon', 'revisar_futura_edicion', 'https://eps.ujaen.es/noticias/hackathon-uja-cyberchallenge', 'Hackathon de ciberseguridad.', 'alta'),
    (auth.uid(), 'Hacken Jaen', 'Hacken', 'Jaen', 'Jaen', 'evento', 'revisar_futura_edicion', 'https://hacken.es/', 'Evento de ciberseguridad. Util para networking.', 'media'),
    (auth.uid(), 'CIBER OLE Jaen', 'CIBER OLE / UJA', 'Jaen', 'Jaen', 'hackathon', 'revisar_futura_edicion', 'https://ciber-ole.eu/info-hack-jaen', 'Hackathon y evento de ciberseguridad.', 'alta'),
    (auth.uid(), 'Hackathon EMACSA Define el Futuro del Agua', 'EMACSA / UCO', 'Cordoba', 'Cordoba', 'hackathon', 'revisar_futura_edicion', 'https://www.uco.es/servicios/actualidad/noticiasactualidaddia/item/164328-emacsa-concedera-dos-becas-formativas-de-ocho-meses-a-traves-de-su-hackathon-define-el-futuro-del-agua', 'Hackathon sobre agua, sostenibilidad e innovacion.', 'alta'),
    (auth.uid(), 'Hackathon IA y Agricultura UCO', 'Universidad de Cordoba', 'Cordoba', 'Cordoba', 'hackathon', 'revisar_futura_edicion', 'https://www.uco.es/servicios/actualidad/sociedad/item/164675-la-catedra-internacional-enia-de-la-uco-convoca-un-hackathon-sobre-inteligencia-artificial-y-agricultura', 'IA aplicada a agricultura. Buen encaje con backend, datos e IA.', 'alta'),
    (auth.uid(), 'AdaByron Andalucia', 'AdaByron / Universidades andaluzas', 'Cordoba', 'Cordoba', 'concurso', 'revisar_futura_edicion', 'https://ada-byron.es/2026/reg/andalucia/', 'Concurso de programacion competitiva.', 'media'),
    (auth.uid(), 'SalmorejoTech', 'SalmorejoTech', 'Cordoba', 'Cordoba', 'evento', 'pendiente', 'https://www.salmorejo.tech/', 'Evento tecnologico de Cordoba.', 'media')
  on conflict do nothing;
end;
$$;

revoke all on function public.seed_hackathons_for_current_user() from public;
grant execute on function public.seed_hackathons_for_current_user() to authenticated;
