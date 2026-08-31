import type { Course, FpCatalogItem, Hackathon, Task } from "@/components/store/types";

const UPCOMING_WINDOW_DAYS = 14;
const DASHBOARD_TODO_LIMIT = 4;

// Mirrors the FP catalogue's event-like type set without importing a client
// feature tree into this plain dashboard data module.
const FP_EVENT_TYPES = new Set(["hackathon", "evento", "reto", "convocatoria_practicas"]);

export type FeedItemKind = "task" | "course" | "hackathon" | "fp_event";

export type FeedItem = {
  id: string;
  title: string;
  /** yyyy-mm-dd actionable date, or "" when the item has none (carousel-only items). */
  date: string;
  href: string;
  kind: FeedItemKind;
  /** Secondary display line (organiser, platform, category...); presentation-only. */
  detail?: string;
};

type Entry = { item: FeedItem; identity: string };

function isActiveTaskStatus(status: Task["status"]) {
  return status !== "completada" && status !== "cancelada";
}

function isActiveCourseStatus(status: Course["status"]) {
  return status !== "terminado" && status !== "descartado";
}

function isActiveHackathonStatus(status: Hackathon["status"]) {
  return status !== "realizado" && status !== "descartado";
}

function isActiveFpStatus(userStatus?: string | null) {
  return userStatus !== "completed" && userStatus !== "dismissed";
}

function isActiveFpCatalogueStatus(status?: string | null) {
  const normalized = String(status || "")
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .toLowerCase();
  return !["finaliz", "cerrad", "cancelad", "descartad", "archivad", "expirad"].some((token) => normalized.includes(token));
}

function isFpEventLike(type: string) {
  return FP_EVENT_TYPES.has(type);
}

const DIACRITICS_PATTERN = new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g");
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dateKey(value?: string | null): string | null {
  if (!value) return null;
  const key = value.slice(0, 10);
  return DATE_KEY_PATTERN.test(key) ? key : null;
}

function localDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addLocalDays(value: Date, days: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);
}

function firstDateInWindow(values: Array<string | null | undefined>, from: string, through: string): string | null {
  const candidates = values
    .map(dateKey)
    .filter((value): value is string => !!value && value >= from && value <= through)
    .sort();
  return candidates[0] ?? null;
}

function isExpired(valuesByTerminalPriority: Array<string | null | undefined>, todayKey: string): boolean {
  const terminalDate = valuesByTerminalPriority.map(dateKey).find((value): value is string => !!value);
  return terminalDate ? terminalDate < todayKey : false;
}

function normalizedTitleKey(value: string) {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// A real source identity (id_slug, or any other stable per-source key) wins
// when one exists. Otherwise, the documented fallback: normalized title +
// date + destination - so the same catalogue event never shows twice just
// because it also surfaces through a different collection with a different
// generated id.
function feedItemIdentity(item: Pick<FeedItem, "title" | "date" | "href">, sourceIdentity?: string | null): string {
  if (sourceIdentity) return `id:${sourceIdentity}`;
  return `fallback:${normalizedTitleKey(item.title)}:${item.date}:${item.href}`;
}

function dedupeEntries(entries: Entry[]): Entry[] {
  const seen = new Set<string>();
  const result: Entry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.identity)) continue;
    seen.add(entry.identity);
    result.push(entry);
  }
  return result;
}

function byDateThenTitle(a: Entry, b: Entry) {
  return (a.item.date || "9999-99-99").localeCompare(b.item.date || "9999-99-99") || a.item.title.localeCompare(b.item.title);
}

// The exact set of tasks Dashboard's To-do card renders. Both DashboardTodo
// (for its own list) and buildUpcomingFeed (to exclude them) call this, so
// the two can never disagree about which tasks already have a home.
export function selectDashboardTodoTasks(tasks: Task[], limit = DASHBOARD_TODO_LIMIT): Task[] {
  return [...tasks].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}

// Deterministic, chronological, deduplicated feed for the next 14 days:
// dated pending tasks not already in To-do, active user-created courses and
// events/challenges with an actionable date, and saved (favourited) FP
// catalogue events/challenges with a start or end date. Undated items never
// appear here - there is nothing chronological to place them at.
export function buildUpcomingFeed(params: {
  tasks: Task[];
  courses: Course[];
  hackathons: Hackathon[];
  fpContent: FpCatalogItem[];
  todoTaskIds: ReadonlySet<string>;
  today?: Date;
}): FeedItem[] {
  const today = params.today ?? new Date();
  const todayKey = localDateKey(today);
  const horizonKey = localDateKey(addLocalDays(today, UPCOMING_WINDOW_DAYS));

  const entries: Entry[] = [];

  for (const task of params.tasks) {
    if (params.todoTaskIds.has(task.id)) continue;
    if (!isActiveTaskStatus(task.status)) continue;
    const date = firstDateInWindow([task.due_at], todayKey, horizonKey);
    if (!date) continue;
    const item: FeedItem = { id: `task-${task.id}`, title: task.title, date, href: "/tasks", kind: "task", detail: task.category };
    entries.push({ item, identity: feedItemIdentity(item, `task:${task.id}`) });
  }

  for (const course of params.courses) {
    if (!isActiveCourseStatus(course.status)) continue;
    const date = firstDateInWindow(
      [course.deadline_at, course.start_at, course.fecha_inicio, course.fecha_fin],
      todayKey,
      horizonKey,
    );
    if (!date) continue;
    const item: FeedItem = {
      id: `course-${course.id}`,
      title: course.title,
      date,
      href: "/courses",
      kind: "course",
      detail: course.entidad || course.platform,
    };
    entries.push({ item, identity: feedItemIdentity(item, course.id_slug ? `content:${course.id_slug}` : null) });
  }

  for (const hackathon of params.hackathons) {
    if (!isActiveHackathonStatus(hackathon.status)) continue;
    const date = firstDateInWindow(
      [hackathon.registration_deadline_at, hackathon.inscripcion_hasta, hackathon.start_at, hackathon.end_at],
      todayKey,
      horizonKey,
    );
    if (!date) continue;
    const item: FeedItem = {
      id: `hackathon-${hackathon.id}`,
      title: hackathon.name,
      date,
      href: "/hackathons",
      kind: "hackathon",
      detail: [hackathon.city || hackathon.province, hackathon.organizer].filter(Boolean).join(" · "),
    };
    entries.push({ item, identity: feedItemIdentity(item, hackathon.id_slug ? `content:${hackathon.id_slug}` : null) });
  }

  for (const fpItem of params.fpContent) {
    if (!isFpEventLike(fpItem.type)) continue;
    if (!fpItem.is_favorite) continue;
    if (!isActiveFpStatus(fpItem.user_status) || !isActiveFpCatalogueStatus(fpItem.status)) continue;
    const date = firstDateInWindow([fpItem.start_date, fpItem.end_date], todayKey, horizonKey);
    if (!date) continue;
    const item: FeedItem = {
      id: `fp-${fpItem.id_slug}`,
      title: fpItem.title,
      date,
      href: "/hackathons",
      kind: "fp_event",
      detail: [fpItem.entity, fpItem.location].filter(Boolean).join(" · "),
    };
    entries.push({ item, identity: feedItemIdentity(item, `content:${fpItem.id_slug}`) });
  }

  return dedupeEntries(entries).sort(byDateThenTitle).map((entry) => entry.item);
}

// The Events and challenges carousel section: saved (favourited) active FP
// catalogue events/challenges first, topped up with the user's own active
// events/challenges only when fewer than three saved items exist. Dates are
// used for ordering only - an undated item is still eligible, unlike in
// buildUpcomingFeed, since this is a "what to look at" list, not a
// chronological one.
export function buildFeaturedHackathonCards(params: { hackathons: Hackathon[]; fpContent: FpCatalogItem[]; today?: Date }): FeedItem[] {
  const todayKey = localDateKey(params.today ?? new Date());
  const savedEntries = dedupeEntries(
    params.fpContent
      .filter((fpItem) => (
        isFpEventLike(fpItem.type)
        && !!fpItem.is_favorite
        && isActiveFpStatus(fpItem.user_status)
        && isActiveFpCatalogueStatus(fpItem.status)
        && !isExpired([fpItem.end_date, fpItem.start_date], todayKey)
      ))
      .map((fpItem): Entry => {
        const item: FeedItem = {
          id: `fp-${fpItem.id_slug}`,
          title: fpItem.title,
          date: firstDateInWindow([fpItem.start_date, fpItem.end_date], todayKey, "9999-99-99") || "",
          href: "/hackathons",
          kind: "fp_event",
          detail: [fpItem.entity, fpItem.location].filter(Boolean).join(" · "),
        };
        return { item, identity: feedItemIdentity(item, `content:${fpItem.id_slug}`) };
      }),
  ).sort(byDateThenTitle);

  if (savedEntries.length >= 3) return savedEntries.slice(0, 3).map((entry) => entry.item);

  const seenIdentities = new Set(savedEntries.map((entry) => entry.identity));
  const userEntries = dedupeEntries(
    params.hackathons
      .filter((hackathon) => (
        isActiveHackathonStatus(hackathon.status)
        && !isExpired([hackathon.end_at, hackathon.start_at, hackathon.registration_deadline_at, hackathon.inscripcion_hasta], todayKey)
      ))
      .map((hackathon): Entry => {
        const item: FeedItem = {
          id: `hackathon-${hackathon.id}`,
          title: hackathon.name,
          date: firstDateInWindow(
            [hackathon.registration_deadline_at, hackathon.inscripcion_hasta, hackathon.start_at, hackathon.end_at],
            todayKey,
            "9999-99-99",
          ) || "",
          href: "/hackathons",
          kind: "hackathon",
          detail: [hackathon.city || hackathon.province, hackathon.organizer].filter(Boolean).join(" · "),
        };
        return { item, identity: feedItemIdentity(item, hackathon.id_slug ? `content:${hackathon.id_slug}` : null) };
      })
      .filter((entry) => !seenIdentities.has(entry.identity)),
  ).sort(byDateThenTitle);

  return [...savedEntries, ...userEntries].slice(0, 3).map((entry) => entry.item);
}
