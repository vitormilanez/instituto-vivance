import { Brand } from "@/components/brand";
import { FirstAccess } from "@/components/first-access";

export default function FirstAccessPage() {
  return (
    <main id="conteudo" className="container" style={{ maxWidth: 520 }}>
      <Brand />
      <section className="panel" style={{ marginTop: 32 }}>
        <p className="eyebrow">Bem-vindo à Vivance</p>
        <h1>Defina sua senha</h1>
        <FirstAccess />
      </section>
    </main>
  );
}
