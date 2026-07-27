import { redirect } from "next/navigation";
import { isTeacherAuthed } from "@/lib/auth";

/** Notes tab retired — Session builder is the single after-class publish screen. */
export default async function AdminPage() {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }
  redirect("/admin/media");
}
