import type { Metadata } from "next";
import { MethodologyContent } from "@/methodology/methodology-content";

export const metadata: Metadata = {
  title: "Methodology | HERU",
  description:
    "Where HERU's numbers come from, how they were adjusted, and how far you can trust them.",
};

export default function MethodologyPage() {
  return <MethodologyContent />;
}
