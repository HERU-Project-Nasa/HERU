import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/button/button-class-name";
import { MaterialSymbol } from "@/icons/material-symbols";
import { GlobeSlot } from "@/earth-globe/globe-slot";
import { ONBOARDING_STEPS } from "@/onboarding/onboarding-steps";
import { StepIndicator } from "@/onboarding/step-indicator";
import { StepReveal } from "@/onboarding/step-reveal";
import { StarField } from "@/star-field/star-field";

export const dynamicParams = false;

export function generateStaticParams() {
  return ONBOARDING_STEPS.map((_, index) => ({ step: String(index + 1) }));
}

export async function generateMetadata({
  params,
}: PageProps<"/onboarding/[step]">): Promise<Metadata> {
  const { step } = await params;
  return {
    title: `Entenda o problema, ${step} de ${ONBOARDING_STEPS.length} | HERU`,
  };
}

export default async function OnboardingPage({
  params,
}: PageProps<"/onboarding/[step]">) {
  const stepNumber = Number((await params).step);
  const step = ONBOARDING_STEPS[stepNumber - 1];

  return (
    <main className="relative -mt-16 flex min-h-svh flex-col overflow-hidden pt-16 lg:-mt-20 lg:pt-20">
      <StarField className="fixed inset-0 -z-10" />
      {step.globeFrameClassName && (
        <GlobeSlot className={step.globeFrameClassName} visible />
      )}
      <section
        aria-labelledby="step-title"
        className={`relative z-[5] flex flex-1 flex-col justify-center gap-10 px-6 pt-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-16 lg:pt-0 lg:pb-28 ${step.globeFrameClassName ? "pb-72" : "pb-28"}`}
      >
        <StepReveal
          order={0}
          className={`flex flex-col gap-4 ${step.wideText ? "max-w-[680px]" : "max-w-[640px] lg:max-w-[480px]"}`}
        >
          <p className="type-eyebrow text-ink-muted">{step.eyebrow}</p>
          <h1 id="step-title" className="type-heading-lg text-ink">
            {step.title}
          </h1>
          {step.body}
          <div className="mt-4 flex flex-wrap gap-3">
            {stepNumber > 1 && (
              <Link
                href={`/onboarding/${stepNumber - 1}`}
                className={buttonClassName({
                  variant: "secondary",
                  size: "lg",
                })}
              >
                <MaterialSymbol name="arrow_back" className="size-[18px]" />
                Voltar
              </Link>
            )}
            {step.nextLabel && (
              <Link
                href={`/onboarding/${stepNumber + 1}`}
                className={buttonClassName({ variant: "primary", size: "lg" })}
              >
                {step.nextLabel}
                <MaterialSymbol name="arrow_forward" className="size-[18px]" />
              </Link>
            )}
          </div>
        </StepReveal>
        {step.figure && (
          <StepReveal
            order={1}
            className="w-full max-w-[640px] lg:w-[46vw] lg:shrink-0"
          >
            {step.figure}
          </StepReveal>
        )}
      </section>
      <StepIndicator
        stepNumber={stepNumber}
        stepCount={ONBOARDING_STEPS.length}
      />
    </main>
  );
}
