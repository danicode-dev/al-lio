// All copy for the public landing and its legal pages, in the two
// languages the landing offers. The authenticated app is not covered here.
// Spanish lives at "/", English under "/en".

export type Lang = "es" | "en";

type ModuleCopy = { label: string; description: string };
type Family = { code: string; name: string; line: string };

type Messages = {
  nav: { signIn: string; langMenu: string };
  hero: { eyebrow: string; titleLines: [string, string]; lead: string; scrollCue: string };
  panel: { title: string; lead: string; diagramAria: string };
  cycle: {
    eyebrow: string;
    title: string;
    lead: string;
    projectLink: string;
    families: [Family, Family, Family, Family];
  };
  footer: {
    creditBefore: string;
    creditLink: string;
    creditAfter: string;
    openSource: string;
    productHeading: string;
    legalHeading: string;
    links: {
      project: string;
      signIn: string;
      privacy: string;
      cookies: string;
      terms: string;
      accessibility: string;
      contact: string;
    };
  };
  cookie: { text: string; policy: string; dismiss: string; aria: string };
  modules: {
    tareas: ModuleCopy;
    calendario: ModuleCopy;
    cursos: ModuleCopy;
    bloc: ModuleCopy;
    eventos: ModuleCopy;
    trabajo: ModuleCopy;
    noticias: ModuleCopy;
    competencias: ModuleCopy;
  };
  legalShell: { kickerDefault: string };
};

export const messages: Record<Lang, Messages> = {
  es: {
    nav: { signIn: "Entrar", langMenu: "Idioma" },
    hero: {
      eyebrow: "Plataforma para estudiantes de FP",
      titleLines: ["Enfoca. Actúa.", "Logra más."],
      lead: "Tu curso en un panel: tareas, prácticas, cursos, eventos y calendario, con noticias y convocatorias de tu ciclo revisadas cada día.",
      scrollCue: "Ver cómo funciona",
    },
    panel: {
      title: "Un panel, todo conectado",
      lead: "Cada área se conecta con AL-LÍO y te cuenta qué aporta.",
      diagramAria: "Los módulos de AL-LÍO conectados",
    },
    cycle: {
      eyebrow: "Para tu ciclo",
      title: "Lo que ves depende de lo que estudias",
      lead: "AL-LÍO conoce tu familia profesional y filtra por ella: los cursos, las prácticas, los eventos y las noticias que ves son los de tu itinerario, no un tablón genérico para todos.",
      projectLink: "Sobre el proyecto",
      families: [
        {
          code: "DAW · DAM",
          name: "Desarrollo",
          line: "Hackathons, retos de código y ofertas de prácticas en desarrollo web y multiplataforma, con los recursos del ciclo siempre a mano.",
        },
        {
          code: "AF",
          name: "Administración y Finanzas",
          line: "Prácticas y convocatorias del ámbito administrativo y contable, y los eventos del sector ordenados junto a tu calendario académico.",
        },
        {
          code: "MP",
          name: "Marketing y Publicidad",
          line: "Eventos del sector, concursos creativos y ofertas en comunicación y publicidad, con las noticias de marketing que de verdad te aplican.",
        },
        {
          code: "TSAF",
          name: "Actividades Físico‑deportivas",
          line: "Competiciones, formaciones y salidas profesionales del ámbito deportivo, filtradas para tu itinerario y tu nivel.",
        },
      ],
    },
    footer: {
      creditBefore: "Proyecto desarrollado gracias a la beca Aircury Summer of Code 2026 de ",
      creditLink: "Aircury SL",
      creditAfter: ".",
      openSource: "Código abierto en GitHub · MIT",
      productHeading: "Producto",
      legalHeading: "Legal",
      links: {
        project: "El proyecto",
        signIn: "Entrar",
        privacy: "Privacidad",
        cookies: "Cookies",
        terms: "Términos",
        accessibility: "Accesibilidad",
        contact: "Contacto",
      },
    },
    cookie: {
      text: "Solo cookies técnicas: sin analítica ni rastreo.",
      policy: "Política de cookies",
      dismiss: "Entendido",
      aria: "Aviso de cookies",
    },
    modules: {
      tareas: { label: "Tareas", description: "Organiza entregas y pendientes en un tablero. Nada se te pasa." },
      calendario: { label: "Calendario", description: "Clases, entregas y eventos en una vista. Se sincroniza con Google Calendar." },
      cursos: { label: "Cursos", description: "La formación de tu ciclo con tu progreso y lo que viene después." },
      bloc: { label: "Bloc de notas", description: "Notas y apuntes rápidos, siempre contigo. Exportables a PDF, Word y TXT." },
      eventos: { label: "Eventos y retos", description: "Hackathons, charlas y convocatorias de tu sector, con fecha e inscripción." },
      trabajo: { label: "Trabajo", description: "Prácticas y ofertas filtradas por tu familia profesional. Sigue tus candidaturas." },
      noticias: { label: "Noticias", description: "Actualidad de tu ciclo, verificada antes de llegar a tu panel." },
      competencias: { label: "Competencias", description: "Qué dominas y qué te falta, con recursos para cerrar cada hueco." },
    },
    legalShell: { kickerDefault: "AL-LÍO" },
  },

  en: {
    nav: { signIn: "Sign in", langMenu: "Language" },
    hero: {
      eyebrow: "A platform for vocational-training students",
      titleLines: ["Focus. Act.", "Do more."],
      lead: "Your course in one panel: tasks, work placements, courses, events and calendar, with news and calls for your programme checked every day.",
      scrollCue: "See how it works",
    },
    panel: {
      title: "One panel, everything connected",
      lead: "Every area links back to AL-LÍO and tells you what it brings.",
      diagramAria: "The AL-LÍO areas, connected",
    },
    cycle: {
      eyebrow: "For your programme",
      title: "What you see depends on what you study",
      lead: "AL-LÍO knows your vocational field and filters by it: the courses, placements, events and news you see are the ones for your track, not a generic board for everyone.",
      projectLink: "About the project",
      families: [
        {
          code: "DAW · DAM",
          name: "Software Development",
          line: "Hackathons, coding challenges and placement offers in web and cross-platform development, with the programme's resources always at hand.",
        },
        {
          code: "AF",
          name: "Administration & Finance",
          line: "Placements and calls in administration and accounting, plus the sector's events lined up next to your academic calendar.",
        },
        {
          code: "MP",
          name: "Marketing & Advertising",
          line: "Industry events, creative competitions and offers in communications and advertising, with the marketing news that actually applies to you.",
        },
        {
          code: "TSAF",
          name: "Sports & Physical Activity",
          line: "Competitions, training and career paths in the sports field, filtered for your track and your level.",
        },
      ],
    },
    footer: {
      creditBefore: "Project developed thanks to the Aircury Summer of Code 2026 grant from ",
      creditLink: "Aircury SL",
      creditAfter: ".",
      openSource: "Open source on GitHub · MIT",
      productHeading: "Product",
      legalHeading: "Legal",
      links: {
        project: "The project",
        signIn: "Sign in",
        privacy: "Privacy",
        cookies: "Cookies",
        terms: "Terms",
        accessibility: "Accessibility",
        contact: "Contact",
      },
    },
    cookie: {
      text: "Technical cookies only: no analytics, no tracking.",
      policy: "Cookie policy",
      dismiss: "Got it",
      aria: "Cookie notice",
    },
    modules: {
      tareas: { label: "Tasks", description: "Organise deadlines and to-dos on a board. Nothing slips through." },
      calendario: { label: "Calendar", description: "Classes, deadlines and events in one view. Syncs with Google Calendar." },
      cursos: { label: "Courses", description: "Your programme's training, with your progress and what comes next." },
      bloc: { label: "Notebook", description: "Quick notes, always with you. Exportable to PDF, Word and TXT." },
      eventos: { label: "Events & challenges", description: "Hackathons, talks and calls in your field, with dates and sign-up." },
      trabajo: { label: "Work", description: "Placements and offers filtered by your vocational field. Track your applications." },
      noticias: { label: "News", description: "News for your programme, checked before it reaches your panel." },
      competencias: { label: "Skills", description: "What you've got down and what's missing, with resources to close each gap." },
    },
    legalShell: { kickerDefault: "AL-LÍO" },
  },
};
