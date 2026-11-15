import Link from "next/link";
import { MaterialSymbol } from "@/icons/material-symbols";

const QUESTIONS = [
  {
    question: "Quando começa a fase mais crítica?",
    answer:
      "Veja a temporada que concentra mais focos e quando ela começa em cada região.",
    action: "Usar calendário",
    href: "/calendar",
  },
  {
    question: "As fontes de calor têm o mesmo ritmo em todo lugar?",
    answer:
      "Escolha uma região e descubra como os focos de calor mudam ao longo dos anos.",
    action: "Escolher região",
    href: "/calendar",
  },
  {
    question: "Esses focos são normais para a época?",
    answer:
      "Veja os meses que fugiram do padrão e como o último mês se compara ao típico.",
    action: "Explorar anomalias",
    href: "/anomalies",
  },
  {
    question: "Posso confiar nesses números?",
    answer:
      "Veja como fizemos a conta, como conferimos e de onde vêm os dados.",
    action: "Ver metodologia",
    href: "/methodology",
  },
];

export function QuestionCards() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {QUESTIONS.map((card) => (
        <li key={card.question} className="flex">
          <Link
            href={card.href}
            className="flex min-h-[200px] flex-1 flex-col justify-between gap-6 rounded-md border border-line bg-surface p-6 text-ink transition-colors duration-120 ease-standard hover:border-line-strong hover:bg-surface-hover"
          >
            <span className="flex flex-col gap-2">
              <span className="type-heading-sm">{card.question}</span>
              <span className="type-body text-ink-muted">{card.answer}</span>
            </span>
            <span className="type-button flex items-center justify-between">
              {card.action}
              <MaterialSymbol name="arrow_forward" className="size-5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
