import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTask, deleteTask, postponeTaskTomorrow, updateTaskStatus } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("tasks")
    .select("id,title,description,category,status,priority,due_date")
    .eq("user_id", user!.id)
    .order("due_date", { ascending: true, nullsFirst: false });
  const tasks = data ?? [];

  return (
    <div>
      <PageHeader title="Tareas" />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader><CardTitle>Nueva tarea</CardTitle></CardHeader>
          <CardContent>
            <form action={createTask} className="space-y-3">
              <Input name="title" placeholder="Titulo" required />
              <Textarea name="description" placeholder="Descripcion" />
              <Input name="category" placeholder="Categoria" defaultValue="personal" />
              <Select name="priority" defaultValue="media"><option>alta</option><option>media</option><option>baja</option></Select>
              <Input name="due_date" type="date" />
              <Button>Crear</Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{task.title}</p>
                    <Badge>{task.status}</Badge>
                    <Badge>{task.priority}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{task.due_date ?? "Sin fecha"} · {task.category}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={updateTaskStatus}><input type="hidden" name="id" value={task.id} /><input type="hidden" name="status" value="completada" /><Button size="sm" variant="outline">Completar</Button></form>
                  <form action={postponeTaskTomorrow}><input type="hidden" name="id" value={task.id} /><Button size="sm" variant="outline">Posponer a manana</Button></form>
                  <form action={deleteTask}><input type="hidden" name="id" value={task.id} /><Button size="sm" variant="ghost">Eliminar</Button></form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
