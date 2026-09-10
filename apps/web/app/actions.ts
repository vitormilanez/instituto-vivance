"use server";
import { redirect } from "next/navigation";
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
  redirect("/clinicas");
}

export async function logout() {
  const client = await createClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error)
    throw new Error("Não foi possível encerrar a sessão. Tente novamente.");
  redirect("/");
}

export async function savePatient(
  id: string,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    await createPatient(id, {
      display_name: form.get("display_name"),
      birth_date: form.get("birth_date"),
    });
  } catch (error) {
    if (error instanceof InputError || error instanceof AccessError)
      return { error: error.message };
    return {
      error:
        "Não foi possível salvar o cadastro. Confira a lista antes de tentar novamente.",
    };
  }
  revalidatePath(`/clinicas/${id}`);
  redirect(`/clinicas/${id}`);
}
