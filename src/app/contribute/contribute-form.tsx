"use client";

import { useState } from "react";

type Category = { id: string; name: string };
type SourceType = "quran" | "hadith" | "seerah" | "fiqh";

const CHOICE_IDS = ["a", "b", "c", "d"];

const inputClass =
  "rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium";

export default function ContributeForm({ categories }: { categories: Category[] }) {
  const [sourceType, setSourceType] = useState<SourceType>("quran");
  const [externalRef, setExternalRef] = useState("");
  const [textTranslation, setTextTranslation] = useState("");
  const [translator, setTranslator] = useState("");
  const [grading, setGrading] = useState<"sahih" | "hasan" | "">("");
  const [madhab, setMadhab] = useState("");
  const [citationText, setCitationText] = useState("");

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [questionText, setQuestionText] = useState("");
  const [choices, setChoices] = useState(CHOICE_IDS.map((id) => ({ id, text: "" })));
  const [correctChoiceId, setCorrectChoiceId] = useState("a");
  const [explanationText, setExplanationText] = useState("");
  const [difficulty, setDifficulty] = useState(2);

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastAction, setLastAction] = useState<"draft" | "submitted" | null>(null);

  function updateChoice(id: string, text: string) {
    setChoices((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)));
  }

  function resetForm() {
    setExternalRef("");
    setTextTranslation("");
    setTranslator("");
    setGrading("");
    setMadhab("");
    setCitationText("");
    setQuestionText("");
    setChoices(CHOICE_IDS.map((id) => ({ id, text: "" })));
    setCorrectChoiceId("a");
    setExplanationText("");
    setDifficulty(2);
  }

  async function handleSubmit(submitForReview: boolean) {
    setStatus("saving");
    setErrorMessage("");

    const payload = {
      source: {
        type: sourceType,
        externalRef,
        textTranslation: textTranslation || undefined,
        translator: translator || undefined,
        grading: grading || undefined,
        madhab: madhab || undefined,
        citationText: citationText || undefined,
      },
      question: {
        categoryId,
        questionText,
        choices,
        correctChoiceId,
        explanationText,
        difficulty,
      },
    };

    const createRes = await fetch("/api/content/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const createData = await createRes.json();

    if (!createRes.ok) {
      setStatus("error");
      setErrorMessage(createData.error ?? "Something went wrong.");
      return;
    }

    if (submitForReview) {
      const submitRes = await fetch(`/api/content/questions/${createData.questionId}/submit`, {
        method: "POST",
      });
      if (!submitRes.ok) {
        const submitData = await submitRes.json();
        setStatus("error");
        setErrorMessage(submitData.error ?? "Saved as draft, but could not submit for review.");
        return;
      }
      setLastAction("submitted");
    } else {
      setLastAction("draft");
    }

    setStatus("saved");
    resetForm();
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="mt-6 flex flex-col gap-8"
    >
      {status === "saved" && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {lastAction === "submitted"
            ? "Submitted for review — a reviewer (not you) will need to approve it."
            : "Saved as a draft. You can submit it for review later."}
        </div>
      )}
      {status === "error" && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      <fieldset className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Source</legend>

        <label className={labelClass}>
          Type
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as SourceType)}
            className={inputClass}
          >
            <option value="quran">Quran</option>
            <option value="hadith">Hadith</option>
            <option value="seerah">Seerah</option>
            <option value="fiqh">Fiqh</option>
          </select>
        </label>

        <label className={labelClass}>
          Reference {sourceType === "quran" && "(e.g. 2:255)"}
          {sourceType === "hadith" && "(e.g. bukhari:1:1:1)"}
          <input
            required
            value={externalRef}
            onChange={(e) => setExternalRef(e.target.value)}
            className={inputClass}
          />
        </label>

        {sourceType === "quran" && (
          <>
            <label className={labelClass}>
              Translation text (optional)
              <textarea
                value={textTranslation}
                onChange={(e) => setTextTranslation(e.target.value)}
                className={inputClass}
                rows={2}
              />
            </label>
            <label className={labelClass}>
              Translator / edition {textTranslation && <span className="text-danger">*</span>}
              <input
                value={translator}
                onChange={(e) => setTranslator(e.target.value)}
                placeholder="e.g. Saheeh International"
                className={inputClass}
              />
            </label>
          </>
        )}

        {sourceType === "hadith" && (
          <label className={labelClass}>
            Grading <span className="text-danger">*</span>
            <select
              required
              value={grading}
              onChange={(e) => setGrading(e.target.value as "sahih" | "hasan")}
              className={inputClass}
            >
              <option value="">Select…</option>
              <option value="sahih">Sahih</option>
              <option value="hasan">Hasan</option>
            </select>
            <span className="text-xs font-normal text-muted-foreground">
              Da&apos;if (weak) or ungraded hadith are rejected by the database — see CONTENT_PROCESS.md §1.
            </span>
          </label>
        )}

        {sourceType === "fiqh" && (
          <label className={labelClass}>
            Madhab <span className="text-danger">*</span>
            <select
              required
              value={madhab}
              onChange={(e) => setMadhab(e.target.value)}
              className={inputClass}
            >
              <option value="">Select…</option>
              <option value="hanafi">Hanafi</option>
              <option value="shafii">Shafi&apos;i</option>
              <option value="maliki">Maliki</option>
              <option value="hanbali">Hanbali</option>
              <option value="consensus">Consensus (all schools agree)</option>
            </select>
          </label>
        )}

        {sourceType === "seerah" && (
          <label className={labelClass}>
            Citation <span className="text-danger">*</span>
            <input
              required
              value={citationText}
              onChange={(e) => setCitationText(e.target.value)}
              placeholder="e.g. Ar-Raheeq Al-Makhtum, ch. 3"
              className={inputClass}
            />
          </label>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Question</legend>

        <label className={labelClass}>
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Question text
          <textarea
            required
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className={inputClass}
            rows={2}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Choices — mark the correct one</span>
          {choices.map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="correctChoice"
                checked={correctChoiceId === c.id}
                onChange={() => setCorrectChoiceId(c.id)}
              />
              <input
                required
                value={c.text}
                onChange={(e) => updateChoice(c.id, e.target.value)}
                placeholder={`Choice ${c.id.toUpperCase()}`}
                className={`${inputClass} flex-1`}
              />
            </label>
          ))}
        </div>

        <label className={labelClass}>
          Explanation (shown after answering)
          <textarea
            required
            value={explanationText}
            onChange={(e) => setExplanationText(e.target.value)}
            className={inputClass}
            rows={2}
          />
        </label>

        <label className={labelClass}>
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className={inputClass}
          >
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={status === "saving"}
          onClick={() => handleSubmit(false)}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-card disabled:opacity-50"
        >
          Save as draft
        </button>
        <button
          type="button"
          disabled={status === "saving"}
          onClick={() => handleSubmit(true)}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save & submit for review"}
        </button>
      </div>
    </form>
  );
}
