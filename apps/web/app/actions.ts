"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPatient } from "@/modules/patients/service";
import { InputError } from "@/lib/validation";
import { AccessError } from "@/modules/identity/service";
export type FormState = { error: string };

export async function login(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const email = form.get("email");
  const password = form.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 254 ||
    !password ||
    password.length > 1024
  ) {
    return { error: "Informe seu e-mail e sua senha." };
  }
  try {
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error)
      return {
        error:
          "Não foi possível entrar. Confira suas credenciais ou tente mais tarde.",
      };
  } catch {
    return { error: "O acesso está indisponível no momento. Tente novamente." };
  }
  const cookieStore = await cookies();
  cookieStore.delete("vivance-invitation-login");
  redirect("/clinicas");
}

// The confirmed invitation email is a login hint, never an authorization grant.
export async function enterPatientInvitation(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const value = form.get("email");
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Confira seu e-mail antes de continuar." };
  let sameAccount = false;
  try {
    const client = await createClient();
    const { data } = await client.auth.getUser();
    sameAccount = data.user?.email?.toLowerCase() === email;
    if (!sameAccount) {
      if (data.user) {
        const { error } = await client.auth.signOut({ scope: "local" });
        if (error) return { error: "Não foi possível trocar de conta. Tente novamente." };
      }
      const cookieStore = await cookies();
      cookieStore.set("vivance-invitation-login", encodeURIComponent(email), {
        httpOnly: true, secure: process.env.NODE_ENV === "production",
        sameSite: "lax", path: "/", maxAge: 600,
      });
    }
  } catch {
    return { error: "Não foi possível preparar seu acesso. Tente novamente." };
  }
  redirect(sameAccount ? "/clinicas" : "/login");
}

export async function logout() {
  const client = await createClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error)
    throw new Error("Não foi possível encerrar a sessão. Tente novamente.");
  redirect("/login");
}

export async function savePatient(
  id: string,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  let patientId = "";
  try {
    const patient = await createPatient(id, {
      display_name: form.get("display_name"),
      birth_date: form.get("birth_date"),
    });
    patientId = patient.id;
  } catch (error) {
    if (error instanceof InputError || error instanceof AccessError)
      return { error: error.message };
    return {
      error:
        "Não foi possível salvar o cadastro. Confira a lista antes de tentar novamente.",
    };
  }
  revalidatePath(`/clinicas/${id}`);
  revalidatePath(`/clinicas/${id}/pacientes`);
  redirect(
    `/clinicas/${id}/pacientes/${patientId}?acolhimento=novo#acolhimento-inicial`,
  );
}
