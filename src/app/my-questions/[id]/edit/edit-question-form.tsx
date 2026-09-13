"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };
type SourceType = "quran" | "hadith" | "seerah" | "fiqh";
type Source = {
  type: SourceType;
  external_ref: string;
  text_translation: string | null;
  translator: string | null;
  grading: "sahih" | "hasan" | null;
  madhab: string | null;
  citation_text: string | null;
};
type Question = {
  category_id: string;
  question_text: string;
  choices: { id: string; text: string }[];
  correct_choice_id: string;
  explanation_text: string;
  difficulty: number;
};

const inputClass =
  "rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium";

export default function EditQuestionForm({
  questionId,
  categories,
  initialSource,
  initialQuestion,
}: {
  questionId: string;
  categories: Category[];
  initialSource: Source;
  initialQuestion: Question;
}) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType>(initialSource.type);
  const [externalRef, setExternalRef] = useState(initialSource.external_ref);
  const [textTranslation, setTextTranslation] = useState(initialSource.text_translation ?? "");
  const [translator, setTranslator] = useState(initialSource.translator ?? "");
  const [grading, setGrading] = useState<"sahih" | "hasan" | "">(initialSource.grading ?? "");
  const [madhab, setMadhab] = useState(initialSource.madhab ?? "");
  const [citationText, setCitationText] = useState(initialSource.citation_text ?? "");

  const [categoryId, setCategoryId] = useState(initialQuestion.category_id);
  const [questionText, setQuestionText] = useState(initialQuestion.question_text);
  const [choices, setChoices] = useState(initialQuestion.choices);
  const [correctChoiceId, setCorrectChoiceId] = useState(initialQuestion.correct_choice_id);
  const [explanationText, setExplanationText] = useState(initialQuestion.explanation_text);
  const [difficulty, setDifficulty] = useState(initialQuestion.difficulty);

  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  function updateChoice(id: string, text: string) {
    setChoices((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)));
  }

  async function handleSave(resubmit: boolean) {
    setStatus("saving");
    setError("");

    const res = await fetch(`/api/content/questions/${questionId}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: {
          type: sourceType,
          externalRef,
          textTranslation: textTranslation || undefined,
          translator: translator || undefined,
          grading: grading || undefined,
          madhab: madhab || undefined,
          citationText: citationText || undefined,
        },
        question: { categoryId, questionText, choices, correctChoiceId, explanationText, difficulty },
        resubmit,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setStatus("error");
      return;
    }

    router.push("/my-questions");
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="mt-6 flex flex-col gap-8">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
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
          Reference
          <input required value={externalRef} onChange={(e) => setExternalRef(e.target.value)} className={inputClass} />
        </label>

        {sourceType === "quran" && (
          <>
            <label className={labelClass}>
              Translation text (optional)
              <textarea value={textTranslation} onChange={(e) => setTextTranslation(e.target.value)} className={inputClass} rows={2} />
            </label>
            <label className={labelClass}>
              Translator / edition {textTranslation && <span className="text-danger">*</span>}
              <input value={translator} onChange={(e) => setTranslator(e.target.value)} className={inputClass} />
            </label>
          </>
        )}

        {sourceType === "hadith" && (
          <label className={labelClass}>
            Grading <span className="text-danger">*</span>
            <select required value={grading} onChange={(e) => setGrading(e.target.value as "sahih" | "hasan")} className={inputClass}>
              <option value="">Select…</option>
              <option value="sahih">Sahih</option>
              <option value="hasan">Hasan</option>
            </select>
          </label>
        )}

        {sourceType === "fiqh" && (
          <label className={labelClass}>
            Madhab <span className="text-danger">*</span>
            <select required value={madhab} onChange={(e) => setMadhab(e.target.value)} className={inputClass}>
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
            <input required value={citationText} onChange={(e) => setCitationText(e.target.value)} className={inputClass} />
          </label>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Question</legend>

        <label className={labelClass}>
          Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Question text
          <textarea required value={questionText} onChange={(e) => setQuestionText(e.target.value)} className={inputClass} rows={2} />
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
                className={`${inputClass} flex-1`}
              />
            </label>
          ))}
        </div>

        <label className={labelClass}>
          Explanation (shown after answering)
          <textarea required value={explanationText} onChange={(e) => setExplanationText(e.target.value)} className={inputClass} rows={2} />
        </label>

        <label className={labelClass}>
          Difficulty
          <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className={inputClass}>
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
          onClick={() => handleSave(false)}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-card disabled:opacity-50"
        >
          Save as draft
        </button>
        <button
          type="button"
          disabled={status === "saving"}
          onClick={() => handleSave(true)}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save & resubmit for review"}
        </button>
      </div>
    </form>
  );
}
