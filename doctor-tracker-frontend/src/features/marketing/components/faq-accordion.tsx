"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FaqItem } from "@/features/marketing/content/faq";
import { cn } from "@/lib/utils";

export function FaqAccordion({ items, className }: { items: readonly FaqItem[]; className?: string }) {
  return (
    <Accordion type="single" collapsible className={cn("rounded-lg border bg-card px-5 md:px-6", className)}>
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
