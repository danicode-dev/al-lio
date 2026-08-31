"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays, CheckSquare2, Clock, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useStore } from "@/shared/store/store-provider";
import type { ReturnTypeActions } from "@/components/store/types";
import { FeaturePage } from "@/shared/ui/feature-page";

type TaskBucket = "diario" | "urgente" | "semanal";

type AppSettings = {
  displayName: string;
  defaultTaskBucket: TaskBucket;
  compactTaskView: boolean;
};

const appSettingsKey = "techlife.app.settings.D1OS.v1";

const defaultAppSettings: AppSettings = {
  displayName: "",
  defaultTaskBucket: "diario",
  compactTaskView: true,
};

const taskBuckets: Array<{
  id: TaskBucket;
  title: string;
  shortTitle: string;
  description: string;
  tone: string;
  Icon: typeof ListTodo;
}> = [
  {
    id: "diario",
    title: "Diario",
    shortTitle: "Hoy",
    description: "Lo que necesita avanzar antes de cerrar el dia.",
    tone: "from-sky-500 to-cyan-500",
    Icon: CheckSquare2,
  },
  {
    id: "urgente",
    title: "Pendiente",
    shortTitle: "Pendiente",
    description: "Bloqueos, bugs y acciones pendientes.",
    tone: "from-amber-500 to-orange-500",
    Icon: Clock,
  },
  {
    id: "semanal",
    title: "Semanal",
    shortTitle: "Semana",
    description: "Plan de foco para mantener el ritmo.",
    tone: "from-emerald-500 to-teal-500",
    Icon: CalendarDays,
  },
];

function Settings({ reset, addTask }: { reset: () => void; addTask: ReturnTypeActions["addTask"] }) {
  const { settings, updateSettings } = useAppSettings();
  const [seeded, setSeeded] = useState(false);

  function seedDemoData() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const today2h = new Date(now);
    today2h.setHours(now.getHours() + 2);

    addTask({ title: "Revisar correos urgentes", status: "pendiente", priority: "critica", category: "urgente", due_at: toDatetimeLocalValue(yesterday) });
    addTask({ title: "Preparar presentación del proyecto", status: "pendiente", priority: "alta", category: "diario", due_at: toDatetimeLocalValue(today2h) });
    addTask({ title: "Llamar al cliente sobre el presupuesto", status: "pendiente", priority: "alta", category: "diario", due_at: toDatetimeLocalValue(now) });
    addTask({ title: "Subir entrega a la plataforma", status: "pendiente", priority: "alta", category: "semanal", due_at: toDatetimeLocalValue(today2h) });
    addTask({ title: "Revisar PR del compañero", status: "pendiente", priority: "media", category: "pendiente" });
    setSeeded(true);
  }

  return (
    <Section title="Configuración">
      <Card className="p-5 space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nombre mostrado</label>
          <Input
            value={settings.displayName}
            onChange={(e) => updateSettings({ displayName: e.target.value })}
            placeholder="Tu nombre o alias"
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">Nombre que aparece en tu perfil y ajustes.</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Columna por defecto en tareas</label>
          <Select
            value={settings.defaultTaskBucket}
            onChange={(e) => updateSettings({ defaultTaskBucket: e.target.value as TaskBucket })}
            className="max-w-xs"
          >
            {taskBuckets.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">Columna pre-seleccionada al añadir una tarea desde el dashboard.</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Vista compacta de tareas</label>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              role="switch"
              aria-checked={settings.compactTaskView}
              onClick={() => updateSettings({ compactTaskView: !settings.compactTaskView })}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                settings.compactTaskView ? "border-[#e19b7c] bg-[#fbe7dd]" : "border-transparent bg-input"
              )}
            >
              <span className={cn(
                "inline-block h-4 w-4 rounded-full shadow transition-all",
                settings.compactTaskView ? "translate-x-6 bg-[#b94720]" : "translate-x-1 bg-white"
              )} />
            </button>
            <span className="text-sm text-muted-foreground">{settings.compactTaskView ? "Activada" : "Desactivada"}</span>
          </div>
          <p className="text-xs text-muted-foreground">Muestra las tareas en formato compacto en el dashboard.</p>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium">Datos de prueba</p>
        <p className="mt-1 text-xs text-muted-foreground">Crea tareas urgentes de ejemplo para probar el resumen diario y las alertas.</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={seedDemoData}
          disabled={seeded}
        >
          {seeded ? "Datos añadidos" : "Añadir datos de prueba"}
        </Button>
      </Card>

      <Card className="p-5 border-destructive/40">
        <p className="text-sm font-medium text-destructive">Zona de peligro</p>
        <p className="mt-1 text-xs text-muted-foreground">Elimina todos los datos del store local (tareas, cursos, etc.). Esta acción no se puede deshacer.</p>
        <Button className="mt-4" variant="outline" onClick={reset}>Resetear datos locales</Button>
      </Card>
    </Section>
  );
}

function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  useEffect(() => {
    const raw = localStorage.getItem(appSettingsKey);
    if (raw) {
      const parsed = safeJson(raw);
      if (parsed) setSettings({ ...defaultAppSettings, ...(parsed as Partial<AppSettings>) });
    }
  }, []);
  function updateSettings(patch: Partial<AppSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(appSettingsKey, JSON.stringify(next));
      return next;
    });
  }
  return { settings, updateSettings };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-5"><h2 className="text-2xl font-semibold tracking-normal">{title}</h2>{children}</div>;
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toDatetimeLocalValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function SettingsFeature() {
  const { actions } = useStore();
  return (
    <FeaturePage eyebrow="Administración" title="Configuración" subtitle="Ajustes del panel y datos de demostración.">
      <Settings reset={actions.reset} addTask={actions.addTask} />
    </FeaturePage>
  );
}
