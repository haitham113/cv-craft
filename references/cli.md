# CLI usage

From the skill directory, Node.js >=22:

```bash
npm ci
npm test
node scripts/cv-craft.mjs validate --file fixtures/example.json
node scripts/cv-craft.mjs approve --scope cv --file fixtures/example.json --workspace .cv-craft-work --confirmation APPROVED
node scripts/cv-craft.mjs render --file fixtures/example.json --workspace .cv-craft-work --output cv-craft-output
node scripts/cv-craft.mjs qa --pdf cv-craft-output/Sample-Candidate-Backend-Engineer-v1.pdf --docx cv-craft-output/Sample-Candidate-Backend-Engineer-v1.docx
node scripts/cv-craft.mjs approve --scope weights --file fixtures/fit.json --workspace .cv-craft-work --confirmation APPROVED
node scripts/cv-craft.mjs score --file fixtures/fit.json --workspace .cv-craft-work
node scripts/cv-craft.mjs inspect --workspace .cv-craft-work
node scripts/cv-craft.mjs close --workspace .cv-craft-work --confirmation CLOSE
```

**Approval is never automatic.** Run the approve command only after the actual candidate approved the exact file in conversation. The confirmation flag records an operator attestation, not independent identity proof. Changed JSON invalidates the prior hash.

Local OCR for supplied scans: `node scripts/cv-craft.mjs ocr --file scan.pdf --lang eng`. Installed OCR language packs control which languages are supported. OCR output is unverified until the candidate confirms important facts.

This CLI never transmits CV data, purchases ATS tests or submits applications. Tools for missing dependencies require separately approved installation. The generated approval log is temporary unless retention is consented to. Do not upload working data into Git.

## Diagnostics and migrations

```bash
node scripts/cv-craft.mjs doctor
node scripts/cv-craft.mjs setup # Debian/Ubuntu only; approved OS packages only; requires installation permissions
node scripts/cv-craft.mjs migrate --file candidate.json --workspace .cv-craft-work
```

Migration v1.0 → v1.1 keeps the source file backed up under the managed workspace's `backups/` directory until explicit closure. Migration changes the canonical JSON hash, so obtain renewed approval before generating a CV. `close` refuses symlinks and unrelated directories.

## Consent-based checkpoints and approval retention

Checkpoint snapshots are **not** saved automatically. After the candidate expressly consents, store one JSON object containing the interview stage and verified evidence:

```bash
node scripts/cv-craft.mjs checkpoint-save --file workflow-state.json --workspace .cv-craft-work --confirmation CONSENT
node scripts/cv-craft.mjs checkpoint-show --workspace .cv-craft-work
node scripts/cv-craft.mjs checkpoint-delete --workspace .cv-craft-work --confirmation DELETE
```

Replace an existing checkpoint by explicitly deleting it and asking for renewed consent before saving. The managed workspace is deleted only on explicit closure.

To retain the structured approvals separately after closure, obtain explicit candidate consent and export outside the managed workspace:

```bash
node scripts/cv-craft.mjs retain-approvals --workspace .cv-craft-work --file /private/path/approvals.json --confirmation CONSENT
```

Do not commit candidate data, approval exports, or checkpoint files to Git.

## OCR acceptance

Synthetic scanned-CV regression tests use the approved local Tesseract executable. OCR is only an extraction method: candidate verification remains required for important details such as names, dates, job titles, qualifications, and performance metrics. Do not treat OCR confidence or text similarity as independent evidence of the candidate's claims.
