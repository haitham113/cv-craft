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
