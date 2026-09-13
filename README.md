# ilmaQuest

**Bismillah.** A Kahoot-style live/async multiplayer quiz app for Islamic knowledge — built for madrasahs, weekend schools, families, and communities to make learning Quran, Hadith, Seerah, and Fiqh fun and competitive, for kids and elders alike.

> Ilm = sacred knowledge. ilmaQuest is the journey to seek it, one question at a time.

## Naming record

Three finalists (DeenQuest, IqraPlay, HalaqaPlay) were considered on 2026-08-23; **HalaqaPlay** was selected first and the project was built under that name initially. On the same day, the name was changed to **ilmaQuest**.

| Name | Meaning | Status |
|---|---|---|
| **ilmaQuest** | Ilm = sacred knowledge + Quest | **Selected** (current) |
| HalaqaPlay | Halaqa = traditional Islamic study circle, used in mosques/madrasahs worldwide | Superseded — used briefly during initial build |
| DeenQuest | Deen = way of life/faith + Quest | Ruled out — identical name already live as a real Islamic quiz app (deenquestapp.com, deenquest.game, multiple Google Play apps) |
| IqraPlay | Iqra = "Read", the first word revealed to the Prophet ﷺ | Backup, not chosen |

**Before public launch**: check domain availability (ilmaquest.com / .app), trademark search, and app store name availability. A quick search on 2026-08-23 found no existing "ilmaQuest" product — no red flags like the DeenQuest collision — but this needs a proper registrar + USPTO check, not just a web search, before relying on it.

## Documentation

This project is documentation-first. Read these before touching code:

1. [docs/CONTENT_PROCESS.md](docs/CONTENT_PROCESS.md) — how religious content is sourced, vetted, and published. **Read this first — it's the highest-risk part of the product.**
2. [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — database schema for content, quizzes, users, and the Chrome extension challenge system.
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — tech stack, system design, real-time quiz mechanics, Chrome extension design.
4. [docs/SECURITY.md](docs/SECURITY.md) — security and privacy requirements, including child-safety/privacy rules since minors will use this app.
5. [docs/BEST_PRACTICES.md](docs/BEST_PRACTICES.md) — coding conventions, git workflow, review process, testing, deployment.
6. [docs/ROADMAP.md](docs/ROADMAP.md) — phased MVP plan.

## Status

📋 Planning phase — no code written yet. Docs are being finalized before implementation starts, by design (see [docs/BEST_PRACTICES.md](docs/BEST_PRACTICES.md)).
