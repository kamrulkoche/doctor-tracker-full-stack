"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_TOPICS, contactSchema, type ContactFormValues } from "@/features/marketing/schemas";

const EMPTY: ContactFormValues = { name: "", email: "", organisation: "", topic: "demo", message: "" };

/**
 * Front-end only: validates and then shows a confirmation. Nothing is sent anywhere; wire
 * `onValid` to a real endpoint when one exists.
 */
export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (submitted) successRef.current?.focus();
  }, [submitted]);

  const onValid = async () => {
    // Simulated latency so the pending state is visible in the demo.
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSubmitted(true);
    reset(EMPTY);
  };

  if (submitted) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="flex flex-col items-center rounded-lg border bg-card px-6 py-12 text-center outline-none"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-lg font-semibold">Thanks, your message is ready</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          This is a demonstration form, so nothing was sent. Once connected, our team will reply within one
          business day.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => setSubmitted(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onValid)}
      className="grid gap-5 rounded-lg border bg-card p-6 md:p-8"
      aria-labelledby="contact-form-title"
    >
      <div>
        <h2 id="contact-form-title" className="text-lg font-semibold">
          Send us a message
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Fields marked * are required.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="contact-name" label="Full name" required error={errors.name?.message}>
          {(control) => <Input {...control} autoComplete="name" {...register("name")} />}
        </FormField>
        <FormField id="contact-email" label="Work email" required error={errors.email?.message}>
          {(control) => <Input {...control} type="email" autoComplete="email" {...register("email")} />}
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="contact-organisation"
          label="Organisation"
          help="Optional"
          error={errors.organisation?.message}
        >
          {(control) => <Input {...control} autoComplete="organization" {...register("organisation")} />}
        </FormField>
        <FormField id="contact-topic" label="Topic" required error={errors.topic?.message}>
          {(fieldProps) => (
            <Controller
              control={control}
              name="topic"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger {...fieldProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
                    <SelectValue placeholder="Choose a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TOPICS.map((topic) => (
                      <SelectItem key={topic.value} value={topic.value}>
                        {topic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>
      </div>

      <FormField id="contact-message" label="Message" required error={errors.message?.message}>
        {(control) => <Textarea {...control} rows={5} className="min-h-32" {...register("message")} />}
      </FormField>

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          Please do not include patient information in this form.
        </p>
        <Button type="submit" size="lg" disabled={isSubmitting} className="sm:min-w-36">
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Sending
            </>
          ) : (
            "Send message"
          )}
        </Button>
      </div>
    </form>
  );
}
