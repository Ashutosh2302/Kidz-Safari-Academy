import Link from "next/link";
import { redirect } from "next/navigation";
import { createStudent } from "@/app/actions/students";
import { AdminNav } from "@/components/AdminNav";
import { DashDivider } from "@/components/DashDivider";
import { PortraitPhotoField } from "@/components/PortraitPhotoField";
import { isTeacherAuthed } from "@/lib/auth";
import { toDateInputValue } from "@/lib/dates";

export default async function NewStudentPage() {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/admin/students"
        className="mb-3 inline-flex text-sm font-bold text-forest-soft"
      >
        ← Students
      </Link>
      <h1 className="font-display text-3xl font-bold text-forest">
        Enroll a child
      </h1>
      <p className="mt-1 text-ink-soft">
        Creates a magic link automatically for the parent.
      </p>

      <DashDivider className="!my-4" />
      <AdminNav current="/admin/students" />

      <form action={createStudent} className="surface-card space-y-4 p-5 sm:p-7">
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-forest">Child name</span>
          <input name="name" required className="input-field" placeholder="Aarav Sharma" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-forest">Date of birth</span>
            <input name="dob" type="date" className="input-field" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-forest">Enrolled on</span>
            <input
              name="enrolledOn"
              type="date"
              defaultValue={toDateInputValue()}
              required
              className="input-field"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-forest">Parent name</span>
          <input name="parentName" required className="input-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-forest">Parent phone</span>
          <input
            name="parentPhone"
            required
            inputMode="tel"
            className="input-field"
            placeholder="98765xxxxx"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-forest">
            Monthly fee (₹)
          </span>
          <input
            name="monthlyFee"
            type="number"
            min={0}
            step={100}
            defaultValue={2500}
            className="input-field"
          />
        </label>
        <PortraitPhotoField />
        <button type="submit" className="btn-primary w-full">
          Create student
        </button>
      </form>
    </main>
  );
}
