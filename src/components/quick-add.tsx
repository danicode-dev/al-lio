"use client";

import { useState } from "react";
import { BookOpen, ChevronRight, ListTodo, Plus, Trophy, X } from "lucide-react";

import type { ReturnTypeActions } from "@/components/guest-app";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type QuickAddType = "task" | "course" | "hackathon";

type QuickAddProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  actions: ReturnTypeActions;
};

export function QuickAdd({ open, setOpen, actions }: QuickAddProps) {
  const [type, setType] = useState<QuickAddType>("task");
  const [showDates, setShowDates] = useState(false);

  function changeType(nextType: QuickAddType) {
    setType(nextType);
    setShowDates(false);
  }

  function submit(form: FormData) {
    const title = valueOf(form, "title");
    if (!title) return;

    if (type === "task") {
      actions.addTask({
        title,
        description: valueOf(form, "notes"),
        due_at: "",
        status: "pendiente",
        priority: "media",
        category: "diario",
      });
    }
    if (type === "course") {
      actions.addCourse({
        title,
        platform: valueOf(form, "platform"),
        url: valueOf(form, "url"),
        start_at: valueOf(form, "start_at"),
        deadline_at: valueOf(form, "deadline_at"),
        status: "pendiente",
        notes: valueOf(form, "notes"),
      });
    }
    if (type === "hackathon") {
      actions.addHackathon({
        name: title,
        organizer: valueOf(form, "organizer"),
        province: "Granada",
        city: valueOf(form, "city"),
        status: "revisar_futura_edicion",
        priority: "media",
        start_at: valueOf(form, "start_at"),
        end_at: valueOf(form, "end_at"),
        registration_deadline_at: valueOf(form, "registration_deadline_at"),
        url: valueOf(form, "url"),
        notes: valueOf(form, "notes"),
      });
    }
    setOpen(false);
  }

  return (
    <>
      {open && (
        <Card className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-[20px] border-[#e4dfd5] bg-white p-4 shadow-[0_22px_50px_rgba(37,30,20,0.18)] md:bottom-20 md:right-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#e15d2d]">Alta rápida</p>
              <h2 className="mt-0.5 font-semibold text-[#111111]">Añadir a AL-LÍO</h2>
            </div>
            <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Cerrar alta rápida"><X className="h-4 w-4" /></Button>
          </div>
          <QuickAddForm action={submit}>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#f8f6f1] p-1" role="tablist" aria-label="Tipo de alta">
              <QuickAddTab active={type === "task"} onClick={() => changeType("task")} icon={<ListTodo className="h-3.5 w-3.5" />}>Tarea</QuickAddTab>
              <QuickAddTab active={type === "course"} onClick={() => changeType("course")} icon={<BookOpen className="h-3.5 w-3.5" />}>Curso</QuickAddTab>
              <QuickAddTab active={type === "hackathon"} onClick={() => changeType("hackathon")} icon={<Trophy className="h-3.5 w-3.5" />}>Reto</QuickAddTab>
            </div>

            <Input name="title" placeholder={type === "task" ? "¿Qué quieres hacer?" : type === "course" ? "Nombre del curso" : "Nombre del reto o hackathon"} autoFocus required />

            {type === "task" && (
              <>
                <Textarea name="notes" placeholder="Añade una nota si la necesitas (opcional)" rows={3} />
                <p className="text-xs leading-5 text-[#777269]">Podrás planificarla con fecha desde Tareas o Calendario.</p>
              </>
            )}

            {type === "course" && (
              <>
                <Input name="platform" placeholder="Plataforma (opcional)" />
                <Input name="url" type="url" placeholder="Enlace (opcional)" />
                <Textarea name="notes" placeholder="Nota (opcional)" rows={2} />
              </>
            )}

            {type === "hackathon" && (
              <>
                <Input name="organizer" placeholder="Organiza (opcional)" />
                <div className="grid grid-cols-2 gap-2">
                  <Input name="city" placeholder="Ciudad" />
                  <Input name="url" type="url" placeholder="Enlace" />
                </div>
                <Textarea name="notes" placeholder="Nota (opcional)" rows={2} />
              </>
            )}

            {type !== "task" && (
              <>
                <button type="button" onClick={() => setShowDates((current) => !current)} className="flex items-center gap-1.5 self-start text-xs font-bold text-[#e15d2d] transition hover:text-[#c6491d]">
                  {showDates ? "Ocultar fechas" : "Añadir fechas (opcional)"}
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showDates && "rotate-90")} />
                </button>
                {showDates && (type === "course" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input name="start_at" type="datetime-local" aria-label="Inicio del curso" />
                    <Input name="deadline_at" type="datetime-local" aria-label="Fecha límite del curso" />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input name="start_at" type="datetime-local" aria-label="Inicio del reto" />
                      <Input name="end_at" type="datetime-local" aria-label="Fin del reto" />
                    </div>
                    <Input name="registration_deadline_at" type="datetime-local" aria-label="Fecha límite de inscripción" />
                  </div>
                ))}
              </>
            )}

            <Button className="w-full bg-[#f06a37] text-white hover:bg-[#df5725]">{type === "task" ? "Añadir tarea" : type === "course" ? "Añadir curso" : "Añadir reto"}</Button>
          </QuickAddForm>
        </Card>
      )}
      <Button
        size="icon"
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full border border-[#f68a62] bg-[#f06a37] text-white shadow-[0_14px_30px_rgba(240,106,55,0.34)] transition hover:scale-105 hover:bg-[#df5725] focus-visible:ring-[#f06a37] md:bottom-5 md:right-5"
        onClick={() => setOpen(!open)}
        aria-label="Añadir rápido"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}

function QuickAddForm({ children, action }: { children: React.ReactNode; action: (data: FormData) => void }) {
  return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); action(new FormData(event.currentTarget)); event.currentTarget.reset(); }}>{children}</form>;
}

function QuickAddTab({ active, children, icon, onClick }: { active: boolean; children: React.ReactNode; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn("flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition", active ? "bg-white text-[#e15d2d] shadow-[0_2px_8px_rgba(37,30,20,0.08)]" : "text-[#777269] hover:text-[#333029]")}>
      {icon}{children}
    </button>
  );
}

function valueOf(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
