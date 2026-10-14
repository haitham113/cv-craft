# CV Craft — Decision-to-Evidence Acceptance Matrix

**Status:** Development audit; NOT a release approval. Last updated October 2026.

Each of the 85 approved decisions appears exactly once. Status is conservative:
- **TESTED:** meaningful automated regression exists, though broader real-world tests may still be needed.
- **PARTIAL:** implementation exists but important behavior is not fully validated.
- **INSTRUCTION_ONLY:** described as agent behavior; no automated/pilot proof yet.
- **BLOCKED:** known release issue, do not claim feature complete.

**Counts:** INSTRUCTION_ONLY: 41 · PARTIAL: 23 · TESTED: 19 · BLOCKED: 2

| ID | Approved decision | Status | Evidence / next verification |
|---:|---|---|---|
| 1 | Universal audience | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 2 | Existing or new CV | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 3 | Optional job description | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 4 | Pasted/files/URLs/connectors | PARTIAL | SKILL.md; references/workflow.md (instructions only) |
| 5 | Hybrid fact verification | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 6 | Deep employer research | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 7 | Comprehensive candidate interview | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 8 | Relevance-first selection | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 9 | Adaptive CV length | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 10 | PDF and DOCX | PARTIAL | scripts/cv-craft.mjs; scripts/pdf-layout-qa.mjs; tests/*.test.mjs |
| 11 | Interactive draft review | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 12 | Comprehensive QA | PARTIAL | scripts/cv-craft.mjs; scripts/pdf-layout-qa.mjs; tests/*.test.mjs |
| 13 | Temporary storage by default | TESTED | scripts/cv-craft.mjs (approvals/checkpoint/close); tests/cv-craft.test.mjs |
| 14 | Multilingual RTL outputs | BLOCKED | scripts/cv-craft.mjs; scripts/pdf-layout-qa.mjs; tests/*.test.mjs |
| 15 | Adaptive templates | PARTIAL | SKILL.md; references/workflow.md (instructions only) |
| 16 | Critical job-fit approval | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 17 | Single-job scope | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 18 | Optional application materials | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 19 | No external submission | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 20 | Portable execution | PARTIAL | SKILL.md; references/workflow.md (instructions only) |
| 21 | Allowed automatic dependencies | PARTIAL | config/dependencies.json; scripts/cv-craft.mjs (doctor/setup) |
| 22 | Explicit and automatic activation | PARTIAL | SKILL.md; README.md; .github/workflows/ci.yml |
| 23 | One interview question at a time | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 24 | Evidence sufficiency approval | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 25 | Modular skill | TESTED | SKILL.md; README.md; .github/workflows/ci.yml |
| 26 | Claim-level evidence | TESTED | scripts/lib/validate.mjs; schemas/; tests/cv-craft.test.mjs |
| 27 | Coverage matrix and fit score | PARTIAL | scripts/cv-craft.mjs (score/QA); references/workflow.md |
| 28 | Approve scoring weights | INSTRUCTION_ONLY | scripts/cv-craft.mjs (score/QA); references/workflow.md |
| 29 | Verified-only score | TESTED | scripts/cv-craft.mjs (score/QA); references/workflow.md |
| 30 | Candidate voice | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 31 | Approved estimates | PARTIAL | scripts/lib/validate.mjs; schemas/; tests/cv-craft.test.mjs |
| 32 | Confidentiality review | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 33 | Authorized candidate sources only | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 34 | QA in conversation | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 35 | Research source outage approval | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 36 | Broad untargeted CV | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 37 | Privacy-first personal data | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 38 | Critical QA gates | PARTIAL | SKILL.md; references/workflow.md (instructions only) |
| 39 | Two installation scopes | PARTIAL | SKILL.md; README.md; .github/workflows/ci.yml |
| 40 | Comprehensive tests | PARTIAL | SKILL.md; references/workflow.md (instructions only) |
| 41 | Human release approval | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 42 | Optional materials in conversation | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 43 | Career gaps candidate control | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 44 | Approved dependency allowlist | PARTIAL | config/dependencies.json; scripts/cv-craft.mjs (doctor/setup) |
| 45 | Versioned file organization | TESTED | SKILL.md; references/workflow.md (instructions only) |
| 46 | Independent file generation | TESTED | scripts/cv-craft.mjs; scripts/pdf-layout-qa.mjs; tests/*.test.mjs |
| 47 | Flexible content blocks | PARTIAL | scripts/lib/validate.mjs; schemas/; tests/cv-craft.test.mjs |
| 48 | Existing design review | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 49 | Role-relevant verified AI | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 50 | Approved partial delivery | PARTIAL | scripts/cv-craft.mjs; scripts/pdf-layout-qa.mjs; tests/*.test.mjs |
| 51 | Explicit cleanup | TESTED | scripts/cv-craft.mjs (approvals/checkpoint/close); tests/cv-craft.test.mjs |
| 52 | Consent-gated checkpoints | TESTED | scripts/cv-craft.mjs (approvals/checkpoint/close); tests/cv-craft.test.mjs |
| 53 | Local + authorized ATS testing | PARTIAL | scripts/cv-craft.mjs (score/QA); references/workflow.md |
| 54 | Consent for full ATS upload | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 55 | Reconcile ATS discrepancies | PARTIAL | scripts/cv-craft.mjs (score/QA); references/workflow.md |
| 56 | Free ATS only | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 57 | Local ATS fallback | PARTIAL | scripts/cv-craft.mjs (score/QA); references/workflow.md |
| 58 | Official employer research | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 59 | Exact job terminology | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 60 | Title modifications require approval | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 61 | Adaptive bullet frameworks | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 62 | Mandatory headline and summary | TESTED | scripts/lib/validate.mjs; schemas/; tests/cv-craft.test.mjs |
| 63 | Categorized skills | TESTED | scripts/lib/validate.mjs; schemas/; tests/cv-craft.test.mjs |
| 64 | Adaptive education | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 65 | Adaptive project presentation | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 66 | Candidate-approved links | PARTIAL | SKILL.md; references/workflow.md (instructions only) |
| 67 | Semantic accessibility | BLOCKED | scripts/cv-craft.mjs; scripts/pdf-layout-qa.mjs; tests/*.test.mjs |
| 68 | Employer research approval | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 69 | Candidate-only approvals | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 70 | Conversation speaker treated as candidate | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 71 | Consent audit export | TESTED | scripts/cv-craft.mjs (approvals/checkpoint/close); tests/cv-craft.test.mjs |
| 72 | Reapproval for all changes | TESTED | scripts/cv-craft.mjs (approvals/checkpoint/close); tests/cv-craft.test.mjs |
| 73 | Versioned revisions | TESTED | scripts/cv-craft.mjs (approvals/checkpoint/close); tests/cv-craft.test.mjs |
| 74 | Metadata sanitation | PARTIAL | scripts/cv-craft.mjs; scripts/pdf-layout-qa.mjs; tests/*.test.mjs |
| 75 | Prompt injection protection | PARTIAL | scripts/scan-untrusted.mjs; tests/acceptance-tools.test.mjs |
| 76 | No inactivity cleanup | TESTED | scripts/cv-craft.mjs (approvals/checkpoint/close); tests/cv-craft.test.mjs |
| 77 | Scanned CV OCR | PARTIAL | scripts/cv-craft.mjs (ocr); references/cli.md |
| 78 | One ATS-first design | TESTED | scripts/cv-craft.mjs; scripts/pdf-layout-qa.mjs; tests/*.test.mjs |
| 79 | Consent for third-party processing | INSTRUCTION_ONLY | SKILL.md; references/workflow.md (instructions only) |
| 80 | Canonical JSON Schema | TESTED | scripts/lib/validate.mjs; schemas/; tests/cv-craft.test.mjs |
| 81 | Versioned schema migrations | TESTED | scripts/lib/validate.mjs; schemas/; tests/cv-craft.test.mjs |
| 82 | System-font fallback | PARTIAL | scripts/cv-craft.mjs; scripts/pdf-layout-qa.mjs; tests/*.test.mjs |
| 83 | Node.js first | TESTED | SKILL.md; README.md; .github/workflows/ci.yml |
| 84 | Selective language fallback | INSTRUCTION_ONLY | SKILL.md; README.md; .github/workflows/ci.yml |
| 85 | Node LTS with lockfile | TESTED | SKILL.md; README.md; .github/workflows/ci.yml |

## Release blockers and acceptance gate

1. **Arabic and other RTL PDF extraction:** Known Unicode/reading-order changes in tested PDF backends. Failed PDFs are blocked from validated delivery. Need a compliant renderer or demonstrate extractability and accurate visual output.
2. **PDF accessibility:** PDFs produced by current WeasyPrint environment are not tagged. No claim of WCAG/PDF-UA or full screen-reader accessibility. Need language-specific tagged-PDF assessment and testing.
3. **Visual layout:** The new PDF layout utility checks page bounds and produces candidate-private preview images. An authorized reviewer MUST inspect screenshots; page geometry alone cannot certify visual correctness.
4. **End-to-end workflows:** Run at least one consented or synthetic complete scenario per mode: existing CV tailoring, from-scratch general CV, role-specific scored CV, multi-language, scanned CV, confidentiality restriction, and denied approval. Record results.
5. **Research and connected-source permissions:** Require explicit permission tests; job posting instructions are untrusted and never higher priority than operator and skill policy.
6. **Output privacy:** Verify metadata and document text in PDF and DOCX, including no tracked changes or accidental candidate-source data in generated files.
7. **Deployment and discovery:** Test both user-wide and project-local skill installation, and both explicit and automatic activation.
8. **Owner signoff:** Draft PR must remain unmerged until all critical issues pass and the owner expressly approves release.

**Overall result:** RELEASE_NOT_READY. Existing tests and instructions do not establish complete fulfillment of all 85 decisions.
## Release hardening round 2 — evidence update

A further **automation and regression hardening pass** added:

- `scripts/lib/text-parity.mjs` with complete word/number preservation checks and explicit RTL reading-order review flags. Numeric and Arabic substitutions no longer pass because an arbitrary fraction of the document was correct.
- `scripts/lib/workflow-gates.mjs` and an `audit-workflow` command, with synthetic tests of candidate-source permissions, employer-review approvals, weighted-fit approval, change invalidation, and exact free-ATS transmission consent. The operator's recorded approvals are **not authenticated user actions**; this is a secondary defense, not a replacement for the Codex conversation.
- `scripts/document-a11y-qa.mjs` and integration into `render`, checking semantic DOCX headings, external hyperlinks, hidden content and PDF tagging signals.
- Symlink-based installation smoke tests for user-wide and project-local Codex skill directories. **Real automatic skill-selection is not tested.**

**Conservative status remains RELEASE_NOT_READY.** This round provides more unit/integration evidence but does not yet change the original 85-decision status counts. The unresolved blocker work is primarily environment-specific: RTL PDF extraction and visual reading order across multiple fonts, full assistive-technology accessibility review, genuine Codex employer-research/interview workflows, and owner-run local activation and visual acceptance. The production release requires a further formal evidence review and explicit signoff.
