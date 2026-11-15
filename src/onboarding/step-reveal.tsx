import type { ReactNode } from "react";

export function StepReveal({
  order,
  className,
  children,
}: {
  order: number;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`motion-safe:animate-step-rise ${className}`}
      style={{ animationDelay: `${order * 100}ms` }}
    >
      {children}
    </div>
  );
}
