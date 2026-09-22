"use client";

import { useEffect, useState } from "react";

// No celular, quando a consulta aberta sai da tela, uma faixa fina no topo
// lembra quem é e quantos itens chegaram. Tocar volta para ela. A faixa não
// rouba o foco e some quando o bloco volta a aparecer. Acima de 650px o CSS a
// esconde: ali o bloco cabe na primeira dobra.
export function StickyConsultation({
  targetId,
  label,
}: {
  targetId: string;
  label: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);
  return (
    <a
      className="home-sticky"
      href={`#${targetId}`}
      data-visible={visible ? "true" : "false"}
      aria-hidden={visible ? undefined : true}
      tabIndex={visible ? undefined : -1}
    >
      {label}
    </a>
  );
}
