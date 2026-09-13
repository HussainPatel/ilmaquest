import { z } from "zod";

// Mirrors the DB-level constraints in
// supabase/migrations/20260823010200_content_pipeline.sql — this validates
// early with a clear error message, but the database is still the real
// enforcement layer (never trust client-side validation alone).
export const sourceSchema = z
  .object({
    type: z.enum(["quran", "hadith", "seerah", "fiqh"]),
    externalRef: z.string().trim().min(1, "A reference (e.g. surah:ayah or hadith number) is required."),
    textTranslation: z.string().trim().optional(),
    translator: z.string().trim().optional(),
    grading: z.enum(["sahih", "hasan"]).optional(),
    madhab: z.enum(["hanafi", "shafii", "maliki", "hanbali", "consensus"]).optional(),
    citationText: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "hadith" && !data.grading) {
      ctx.addIssue({
        code: "custom",
        path: ["grading"],
        message: "Hadith sources must be graded sahih or hasan — see docs/CONTENT_PROCESS.md §1.",
      });
    }
    if (data.type === "fiqh" && !data.madhab) {
      ctx.addIssue({
        code: "custom",
        path: ["madhab"],
        message: "Fiqh sources must be tagged with a madhab (or 'consensus').",
      });
    }
    if (data.type === "seerah" && !data.citationText?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["citationText"],
        message: "Seerah sources require a citation (e.g. book + chapter).",
      });
    }
    if (data.type === "quran" && data.textTranslation && !data.translator?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["translator"],
        message: "A translation requires a translator/edition attribution.",
      });
    }
  });

export const questionSchema = z
  .object({
    categoryId: z.string().uuid("Pick a category."),
    questionText: z.string().trim().min(10, "Question text is too short."),
    choices: z
      .array(
        z.object({
          id: z.string().min(1),
          text: z.string().trim().min(1, "Every choice needs text."),
        })
      )
      .min(2, "At least 2 choices are required.")
      .max(6, "At most 6 choices."),
    correctChoiceId: z.string().min(1, "Pick the correct choice."),
    explanationText: z.string().trim().min(10, "Explanation is too short."),
    difficulty: z.number().int().min(1).max(5),
  })
  .superRefine((data, ctx) => {
    if (!data.choices.some((c) => c.id === data.correctChoiceId)) {
      ctx.addIssue({
        code: "custom",
        path: ["correctChoiceId"],
        message: "The correct choice must match one of the listed choices.",
      });
    }
  });

export const createQuestionSchema = z.object({
  source: sourceSchema,
  question: questionSchema,
});

export const reviewActionSchema = z
  .object({
    action: z.enum(["approve", "reject", "needs_edit"]),
    comment: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action !== "approve" && !data.comment?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["comment"],
        message: "A comment is required when rejecting or requesting edits.",
      });
    }
  });
