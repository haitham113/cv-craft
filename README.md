# CV Craft

Evidence-driven Codex Agent Skill for creating, tailoring, and validating CVs and resumes.

**Status:** development preview; release requires owner approval.

## Install

Clone this repository. For user-wide Codex, link its directory to `~/.agents/skills/cv-craft`; for project-local use `.agents/skills/cv-craft`. Codex discovers `SKILL.md` (YAML front matter).

```bash
npm ci
npm test
node scripts/cv-craft.mjs validate --file fixtures/example.json
```

Node.js 24 LTS is the preferred runtime; 22 LTS may be used when tested. No npm runtime dependencies. For PDF rendering, install a preapproved WeasyPrint or Chromium binary; local PDF QA needs `pdftotext` and DOCX QA needs `unzip`. Installation of any non-allowlisted dependency requires approval.

See [SKILL.md](SKILL.md), [workflow](references/workflow.md) and [CLI](references/cli.md). This skill is NOT a job-submission agent. Do not commit real candidate data or generated CVs.

## Current development limitations

Generated PDF/DOCX should undergo visual inspection for each language. Local parsing is a compatibility check, not an ATS certification. External ATS tests, when available, must be free and require consent for complete CV uploads. OCR languages depend on installed language packs. Unsupported schema migrations fail closed instead of guessing.
