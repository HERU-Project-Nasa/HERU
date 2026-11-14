import type { Metadata } from "next";
import { NotFoundScene } from "@/not-found/not-found-scene";

export const metadata: Metadata = {
  title: "Página não encontrada | HERU",
};

export default function NotFound() {
  return <NotFoundScene />;
}
