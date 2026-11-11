import { z } from "zod";

export const CONTACT_TOPICS = [
  { value: "demo", label: "Request a demo" },
  { value: "sales", label: "Pricing and plans" },
  { value: "support", label: "Product support" },
  { value: "other", label: "Something else" },
] as const;

type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];
const TOPIC_VALUES = CONTACT_TOPICS.map((topic) => topic.value) as [ContactTopic, ...ContactTopic[]];

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100, "Name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .max(254, "Email is too long")
    .pipe(z.email("Enter a valid email address")),
  organisation: z.string().trim().max(120, "Organisation is too long"),
  topic: z.enum(TOPIC_VALUES, { message: "Choose a topic" }),
  message: z
    .string()
    .trim()
    .min(20, "Tell us a little more (at least 20 characters)")
    .max(2000, "Message is too long"),
});

export type ContactFormValues = z.input<typeof contactSchema>;
