"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "cn"
import { Accordion as AccordionPrimitive } from "radix-ui"

function Accordion({ ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-colors duration-150 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 md:text-base [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className="pointer-events-none mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200"
          aria-hidden="true"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn("pb-4 text-muted-foreground leading-relaxed", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
