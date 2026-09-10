import Link from "next/link";
export default function NotFound() {
  return (
    <main id="conteudo" className="container">
      <section className="panel">
        <h1>Página indisponível</h1>
        <p>Este endereço não existe ou você não tem acesso a ele.</p>
        <Link className="button" href="/clinicas">
          Voltar para minhas clínicas
        </Link>
      </section>
    </main>
  );
}
