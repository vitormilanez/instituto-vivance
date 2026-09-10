"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" className="container">
      <section className="panel">
        <h1>Não foi possível carregar</h1>
        <p>
          O serviço está indisponível no momento. Seus dados não foram
          substituídos por exemplos.
        </p>
        <button onClick={reset}>Tentar novamente</button>
      </section>
    </main>
  );
}
