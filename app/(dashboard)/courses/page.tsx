import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCourse, deleteCourse, updateCourseStatus } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("courses").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
  const courses = data ?? [];

  return (
    <div>
      <PageHeader title="Cursos" />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader><CardTitle>Nuevo curso</CardTitle></CardHeader>
          <CardContent>
            <form action={createCourse} className="space-y-3">
              <Input name="title" placeholder="Curso" required />
              <Input name="platform" placeholder="Plataforma" />
              <Input name="url" type="url" placeholder="URL" />
              <Input name="category" placeholder="Categoria" />
              <Select name="status" defaultValue="pendiente"><option>pendiente</option><option>empezado</option><option>terminado</option><option>pausado</option><option>descartado</option></Select>
              <Input name="deadline" type="date" />
              <Textarea name="notes" placeholder="Notas" />
              <Button>Crear</Button>
            </form>
          </CardContent>
        </Card>
        <div className="grid gap-3 xl:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-medium">{course.title}</p><p className="text-sm text-muted-foreground">{course.platform ?? "Sin plataforma"} · {course.deadline ?? "Sin fecha"}</p></div>
                <Badge>{course.status}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {course.url && <Button asChild size="sm" variant="outline"><a href={course.url} target="_blank" rel="noreferrer">Abrir</a></Button>}
                <form action={updateCourseStatus}><input type="hidden" name="id" value={course.id} /><input type="hidden" name="status" value="terminado" /><Button size="sm" variant="outline">Terminado</Button></form>
                <form action={deleteCourse}><input type="hidden" name="id" value={course.id} /><Button size="sm" variant="ghost">Eliminar</Button></form>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
