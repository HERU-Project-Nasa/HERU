import type { Metadata } from "next";
import { NotFoundScene } from "@/not-found/not-found-scene";

export const metadata: Metadata = {
  title: "Page not found | HERU",
};

export default function NotFound() {
  return <NotFoundScene />;
}
