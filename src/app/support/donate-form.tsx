"use client";

import { useState } from "react";
import { HeartHandshake } from "lucide-react";
import { SUPPORTED_CURRENCIES, getCurrency, type CurrencyCode } from "@/lib/donations/currencies";

const PRESET_AMOUNTS = [10, 25, 50];

export default function DonateForm() {
  const [currency, setCurrency] = useState<CurrencyCode>("usd");
  const [interval, setInterval] = useState<"one_time" | "month">("one_time");
  const [amount, setAmount] = useState<number | "">(PRESET_AMOUNTS[1]);
  const [customAmount, setCustomAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const currencyInfo = getCurrency(currency);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const chosenAmount = customAmount ? Number(customAmount) : amount;
    if (!chosenAmount || Number.isNaN(chosenAmount)) {
      setStatus("error");
      setErrorMessage("Enter a valid amount.");
      return;
    }

    const res = await fetch("/api/donations/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents: Math.round(chosenAmount * 100),
        currency,
        interval,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setErrorMessage(data.error ?? "Something went wrong.");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="flex rounded-lg border border-border p-1">
        {(["one_time", "month"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setInterval(opt)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              interval === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt === "one_time" ? "One-time" : "Monthly"}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Currency
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-base font-normal text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code.toUpperCase()} — {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Amount ({currencyInfo?.symbol})</span>
        <div className="flex gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmount(preset);
                setCustomAmount("");
              }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                amount === preset && !customAmount
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-card"
              }`}
            >
              {currencyInfo?.symbol}
              {preset}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={0}
          step="0.01"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          placeholder="Custom amount"
          className="mt-1 rounded-lg border border-border bg-card px-3.5 py-2.5 text-base font-normal text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        <HeartHandshake size={16} />
        {status === "submitting" ? "Redirecting…" : "Continue to payment"}
      </button>
      {status === "error" && <p className="text-sm text-danger">{errorMessage}</p>}
    </form>
  );
}
