import { Brand } from "@/components/brand";
import { ForgotPassword } from "@/components/forgot-password";

export default function ForgotPasswordPage() {
  return (
    <main id="conteudo" className="container" style={{ maxWidth: 520 }}>
      <Brand />
      <section className="panel" style={{ marginTop: 32 }}>
        <p className="eyebrow">Recuperar acesso</p>
        <h1>Esqueci minha senha</h1>
        <ForgotPassword />
      </section>
    </main>
  );
}
