"use client";

import { useActionState } from "react";
import { loginTeacher } from "@/app/actions/auth";

type LoginState = { error?: string } | null;

async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  return loginTeacher(formData);
}

export function TeacherLoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold text-forest">PIN</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          className="input-field text-lg tracking-widest"
          placeholder="••••"
        />
      </label>
      {state?.error && (
        <p className="rounded-2xl border-2 border-red bg-pastel-pink px-4 py-3 text-sm font-semibold text-red-deep">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Checking…" : "Open desk"}
      </button>
    </form>
  );
}
