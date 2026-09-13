import { z } from "zod";
import { CURRENCY_CODES, getCurrency, MAX_AMOUNT_MULTIPLE_OF_MIN } from "./currencies";

export const createCheckoutSchema = z
  .object({
    amountCents: z.number().int().positive(),
    currency: z.enum(CURRENCY_CODES),
    interval: z.enum(["one_time", "month"]),
  })
  .superRefine((data, ctx) => {
    const currency = getCurrency(data.currency);
    if (!currency) return; // unreachable given the enum, kept for type narrowing below

    if (data.amountCents < currency.minAmountCents) {
      ctx.addIssue({
        code: "custom",
        path: ["amountCents"],
        message: `Minimum donation in ${currency.code.toUpperCase()} is ${currency.minAmountCents / 100}.`,
      });
    }
    if (data.amountCents > currency.minAmountCents * MAX_AMOUNT_MULTIPLE_OF_MIN) {
      ctx.addIssue({
        code: "custom",
        path: ["amountCents"],
        message: "That amount is larger than we can accept in one donation — please contact us directly for major gifts.",
      });
    }
  });
