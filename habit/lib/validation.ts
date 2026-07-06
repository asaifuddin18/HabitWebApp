import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const taskInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    description: z.string().trim().max(1000).optional(),
    frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    anchorDate: isoDate.optional(),
    active: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    if ((val.frequency === "weekly" || val.frequency === "biweekly")) {
      if (!val.daysOfWeek || val.daysOfWeek.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["daysOfWeek"],
          message: "Pick at least one day of the week",
        });
      }
    }
    if (val.frequency === "biweekly" && !val.anchorDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["anchorDate"],
        message: "Biweekly tasks need an anchor date",
      });
    }
    if (val.frequency === "monthly" && val.dayOfMonth == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dayOfMonth"],
        message: "Monthly tasks need a day of month",
      });
    }
  });

export type TaskInput = z.infer<typeof taskInputSchema>;

export const completionInputSchema = z.object({
  taskId: z.string().min(1),
  date: isoDate,
  completed: z.boolean(),
});
