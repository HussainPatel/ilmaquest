# Content Sourcing & Vetting Process

This is the most important document in this repository. Getting Islamic religious content wrong — a misquoted ayah, a hadith with a weak chain, a fiqh ruling presented as universal when it's one madhab's opinion — damages trust in a way that's very hard to recover from. This process exists to make that structurally hard to do by accident, not just something reviewers are asked to be careful about.

**Rule zero: no religious content enters the app without a verifiable, machine-checkable source reference. No exceptions, including for AI-assisted drafts.**

## 1. Approved sources only

| Content type | Approved source(s) | Notes |
|---|---|---|
| Quran text | [Tanzil.net](https://tanzil.net) Uthmani script + Tanzil-hosted translations (Saheeh International, Yusuf Ali, Pickthall, etc.) | Always store translator/edition name alongside the translation. Never paraphrase Quran text ourselves. |
| Hadith | [Sunnah.com](https://sunnah.com) API (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, etc.) | **Only `sahih` or `hasan` graded hadith are eligible.** `da'if` (weak) or ungraded hadith must never enter the review queue — enforced at the database layer (see DATA_MODEL.md). |
| Seerah | Named, citable published works only (e.g. *Ar-Raheeq Al-Makhtum*, *Seerah of Ibn Hisham* in translation) — chapter/page cited | No blog posts, no uncredited web summaries. |
| Fiqh | Named madhab-specific texts or a recognized fatwa body, tagged by school | Must carry a `madhab` tag: `hanafi`, `shafii`, `maliki`, `hanbali`, or `consensus` (only when genuinely agreed across all four). |

If a piece of content doesn't have a source in this table, it does not go into ilmaQuest — full stop. Adding a new source type requires updating this document and getting Senior Reviewer sign-off first.

## 2. Content lifecycle (state machine)

```
DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED
             ↓                ↓          ↓
        REJECTED         (needs edit) FLAGGED → RETIRED
```

- **DRAFT** — created by a Contributor or the AI-assist tool. Must have `source_id` set before it can be saved at all (not just before submission).
- **PENDING_REVIEW** — submitted for review. Not visible to end users under any circumstance.
- **NEEDS_EDIT** — a Reviewer sends it back with comments attached; returns to DRAFT.
- **REJECTED** — permanently rejected. Kept in the database for audit purposes, never shown, never resubmitted under the same id.
- **APPROVED** — reviewer signed off. Allows batching approved content ahead of a category launch without immediately publishing.
- **PUBLISHED** — live and playable.
- **FLAGGED** — raised by a user report or a second reviewer after publishing. Automatically pulled from the active question pool the moment it's flagged (fail-safe: pull first, investigate second).
- **RETIRED** — deliberately removed (superseded, duplicate, deprecated), distinct from rejected.

**Editing published content**: a published question is never edited in place. Editing creates a new version (`parent_question_id` points to the original) which must go through PENDING_REVIEW again before it replaces the original in rotation. This preserves a clean audit trail of exactly what was shown to users at any point in time.

## 3. Roles and the two-person rule

| Role | Permissions |
|---|---|
| **AI Assist** | Creates DRAFT only. Cannot change state beyond DRAFT. Every AI-drafted item is visually flagged as AI-drafted in the reviewer UI so reviewers know to check it with extra care. |
| **Contributor** | Creates/edits DRAFT, submits to PENDING_REVIEW. |
| **Reviewer** | Approves, rejects, or requests edits on PENDING_REVIEW items. |
| **Senior Reviewer** (scholar / imam / qualified Islamic studies teacher) | Required sign-off specifically for all **Fiqh** content and anything doctrinally sensitive. Can overrule a Reviewer decision. |
| **Admin** | Publishes approved batches, manages FLAGGED items, manages user roles, can retire content. |

**Hard rule, enforced by the application (not just policy): the person who authored or edited a DRAFT cannot be the one who approves it.** This is a database-level check on `review_log`, not something left to reviewer discipline.

## 4. Reviewer checklist (must pass before APPROVED)

A question cannot move to APPROVED unless every applicable item below is confirmed in the reviewer UI:

- [ ] Source reference is present and resolves to real, checkable content (link/reference shown inline for the reviewer to click through).
- [ ] Quran: translation edition/translator is attributed.
- [ ] Hadith: grading field is `sahih` or `hasan` (UI will not allow submission otherwise).
- [ ] Fiqh: `madhab` tag set; if multiple schools disagree, the question/explanation does not present one view as the only view.
- [ ] The explanation shown to users after answering matches what the source actually says — no embellishment beyond the source.
- [ ] Difficulty/age-tier is appropriate for the target category (kids vs general vs advanced).
- [ ] No depiction, imagined physical description, or image generation involving the Prophet ﷺ or other prohibited depictions.
- [ ] If AI-drafted: reviewer has independently verified the source text themselves, not just trusted the AI's citation.

## 5. AI's role — assist only, never autonomous publishing

- AI may **draft** a question (text, choices, explanation) *from a specific source_id the reviewer or contributor selects* — it does not get to pick its own topic or invent a citation.
- AI output always lands in DRAFT state and is visually marked "AI-drafted, unverified" until a human reviewer confirms it against the actual source.
- AI is **never** used to answer live fiqh questions from users, generate hadith from scratch, or produce explanatory text without an existing approved source to ground it in (this is RAG-only over already-approved content, not open generation).
- AI may be used freely for non-doctrinal things with no religious-accuracy risk: adaptive difficulty selection, performance summaries, UI copy, etc.

## 6. Post-publish safety net

- Every question shown in-game carries a visible **"Report an issue"** control. Any user (logged in or anonymous) can flag it with a reason.
- A configurable flag threshold (e.g. 2 independent flags, or 1 flag from a Reviewer/Admin account) automatically pulls the question from the active rotation pending review — this happens before any human looks at it, not after.
- Admins see a FLAGGED queue with the same review tooling as PENDING_REVIEW, plus the flag reason(s) and reporter history.
- `review_log` is append-only. Every state transition, by whom, and why (comment) is preserved permanently for audit.

## 7. Launch content scope

MVP category set to keep the review workload manageable at launch: **Quran (selected short surahs + well-known ayat) and Seerah (major events)**. Hadith and Fiqh categories are explicitly deferred until the review pipeline and Senior Reviewer capacity are proven out on lower-risk content first (see ROADMAP.md).
