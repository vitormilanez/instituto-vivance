import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/forms";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  const client = await createClient();
  const { data } = await client.auth.getUser();
  if (data.user) redirect("/clinicas");
  return (
    <main id="conteudo" className="login">
      <section className="login-intro">
        <Brand />
        <div>
          <h1>
            Clareza para cuidar.
            <br />
            Presença para acompanhar.
          </h1>
          <p>
            Um espaço para aproximar a equipe e organizar o cuidado contínuo.
          </p>
        </div>
        <small>Acesso individual para pacientes e equipe de cuidado.</small>
      </section>
      <section className="login-form">
        <div>
          <p className="eyebrow">Área de cuidado</p>
          <h2>Entre na sua conta</h2>
          <p>Use o acesso individual liberado pela sua clínica.</p>
          <LoginForm />
          <p style={{ marginTop: 24 }}>
            <small>
              Ainda não tem acesso? Solicite a liberação ao administrador da
              clínica.
            </small>
          </p>
        </div>
      </section>
    </main>
  );
}
