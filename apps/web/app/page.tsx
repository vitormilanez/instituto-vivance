import type { Metadata } from "next";
import { PublicLanding } from "@/components/public-landing";
import "./landing.css";

export const metadata: Metadata = {
  title: "VIVANCE — Mais perto, em cada passo",
  description:
    "Check-in da rotina, proximidade com o médico e histórico organizado. Conheça o Vivance: cuidado contínuo no emagrecimento e no envelhecimento saudável.",
};

export default function Home() {
  return <PublicLanding />;
}
