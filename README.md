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

## Reproducible setup and privacy

Run `node scripts/cv-craft.mjs doctor` first. `setup` installs **only** the OS packages declared in `config/dependencies.json`, on supported Debian/Ubuntu environments when invoked with suitable permissions. No remote install scripts are executed. Do not enable privileged setup inside an untrusted candidate workspace.

CV data uses schema v1.1 (`schemas/cv-v1.1.schema.json`), with validation of v1.0 legacy input. `migrate` upgrades v1.0 to v1.1, writes a backup inside the managed workflow directory, and invalidates content approval hashes. Source documents are never deleted by cleanup.

## Current development limitations

Generated PDF/DOCX should undergo visual inspection for each language. Local parsing is a compatibility check, not an ATS certification. External ATS tests, when available, must be free and require consent for complete CV uploads. OCR languages depend on installed language packs. Unsupported schema migrations fail closed instead of guessing.

### RTL PDF known limitation

Arabic and other right-to-left PDFs may render visually but extract Unicode words incorrectly with some PDF engines and system fonts. The text-parity quality gate blocks such PDFs and removes them from validated output. Only a validated DOCX may be offered **after explicit candidate approval for partial delivery**. Do not claim full multilingual PDF support until a rendering backend passes the RTL tests and visual review.

## Acceptance and security QA

```bash
npm test
node scripts/scan-untrusted.mjs --file job-description.txt
node scripts/pdf-layout-qa.mjs --pdf candidate.pdf --preview-dir .cv-craft-work/previews
```

Treat suspicious-source scans as heuristic warnings (not a guarantee against prompt injection). The PDF QA tool checks page bounds, readability and blank pages; its private PNG previews **require manual visual review**. PDF tagging and full screen-reader accessibility are not certified. Review the [85-decision acceptance matrix](references/acceptance-matrix.md) before any release.

**Release status:** DEVELOPMENT, NOT READY. Multilingual PDF extraction and accessibility remain blockers. No merge without explicit owner approval.


### Optional tagged-PDF output

Where the installed WeasyPrint supports `--pdf-tags`, the renderer enables tagged PDF structure automatically. Older WeasyPrint versions continue to be supported but are reported as untagged by PDF layout QA. Tagging alone is **not** PDF/UA or WCAG certification, and Arabic/RTL Unicode extraction is still a release blocker.
