import { z } from "zod";

export const SubjectTypeEnum = z.enum([
  "PERSON",
  "ORGANIZATION",
  "POLICY",
  "TOPIC",
]);

export const CreateSubjectSchema = z.object({
  name: z
    .string()
    .min(2, "Name is too short")
    .max(200, "Name is too long")
    .trim(),
  type: SubjectTypeEnum,
});

export type CreateSubjectInput = z.infer<typeof CreateSubjectSchema>;
