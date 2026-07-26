import { redirect } from "next/navigation";
import { DashDivider } from "@/components/DashDivider";
import { TeacherLoginForm } from "@/components/TeacherLoginForm";
import { isTeacherAuthed } from "@/lib/auth";

export default async function AdminLoginPage() {
  if (await isTeacherAuthed()) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="surface-card animate-fade-up p-8">
        <span className="pill-green">Teacher desk</span>
        <h1 className="mt-4 font-display text-3xl font-bold text-forest">
          Welcome back
        </h1>
        <p className="mt-2 text-ink-soft">
          Enter the shared PIN to log today&apos;s class.
        </p>
        <DashDivider />
        <TeacherLoginForm />
      </div>
    </main>
  );
}
