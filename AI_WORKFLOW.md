# AI_WORKFLOW.md — AI Engineering Notes

## AI Tools Used

| Tool | Purpose |
|------|---------|
| **Tesseract.js** | Server-side OCR to extract raw text from uploaded images |
| **OpenAI GPT-4o-mini** | Default LLM for structured field extraction from OCR text |
| **Groq (Llama 3.1 8B)** | Fast, free-tier alternative — swappable via `AI_PROVIDER=groq` |
| **Anthropic Claude Haiku** | Alternative provider for higher accuracy requirements |
| **OpenRouter** | Universal gateway — access any model via one API |

---

## Prompting Workflow

### System Prompt Design

The extraction system prompt (`lib/services/extraction.ts`) was designed with these principles:

1. **Role framing**: "You are an expert data extraction assistant for manufacturing operations" — tells the model the domain context upfront
2. **Hard rules**: Explicit instructions like "Extract ONLY what is visible — do not invent values" and "Return ONLY valid JSON"
3. **Confidence guidance**: Detailed scale (0.95+ = very clear, 0.4-0.69 = uncertain) so the model calibrates rather than always returning 0.9
4. **Format examples**: Machine numbers follow patterns (MC-101), shift values (A/B/C/Night), dates in ISO format — all stated explicitly
5. **Low temperature**: `temperature: 0.1` for deterministic, consistent JSON output

### User Prompt Design

The user prompt:
- Clearly delimits the OCR text with `---OCR TEXT START---` / `---OCR TEXT END---` markers to prevent prompt injection
- Provides the **exact JSON schema** the model must return, field-by-field
- Includes the value, confidence, and source for every field — forcing the model to think about certainty per-field

### Why Per-Field Confidence?

Instead of a single document confidence score, every field has its own confidence. This enables:
- Highlighting specific uncertain fields in the UI (red/amber indicators)
- Showing warning badges only where uncertainty exists
- Human reviewers focus attention exactly where it's needed

---

## Debugging Workflow

### Problem: LLM returns malformed JSON
**Solution**: Multi-layer parsing safeguards in `parseLlmResponse()`:
1. Strip markdown code fences (```json ... ```) if model adds them
2. Try `JSON.parse()` — if it fails, log and retry
3. For each expected field, check if it exists and has correct shape
4. Fall back to `{ value: null, confidence: 0 }` for any missing field

### Problem: OCR misreads characters (0 vs O, 1 vs l)
**Solution**: `preprocessOcrText()` in `lib/services/ocr.ts` applies contextual character correction:
- If a `0` appears adjacent to letters → likely `O`
- If a `1` appears adjacent to letters → likely `l`
This runs before the LLM sees the text.

### Problem: LLM API rate limits or timeouts
**Solution**: Retry loop with exponential backoff (1s, 2s) up to 2 retries. If all retries fail, the system saves a fallback empty record and sets status to `needs_review` rather than crashing.

### Problem: Demo without API key
**Solution**: `extractFromOcrDemo()` uses regex heuristics against the OCR text to simulate extraction. Detects dates, shift letters, machine patterns, quantity values, and work order numbers without any API call.

---

## Where AI Helped Most

### 1. Prompt Engineering
Crafting the extraction prompt took the most iteration. Key insights:
- Confidence calibration language is critical — without it, the model returns 0.95 for everything
- The exact JSON schema must be in the user prompt (not just system prompt) to avoid hallucination
- Marking OCR boundaries prevents the model from treating document text as instructions

### 2. Validation Rule Design
AI helped identify the full set of manufacturing-domain validation rules:
- Quantity spike detection (3× machine average) — domain-specific
- Impossible time values (>24h in a single shift)
- Machine number format patterns from real manufacturing standards

### 3. Confidence Score UX
The decision to show per-field confidence badges with color-coded thresholds (green/amber/red) came from AI-assisted UX reasoning about where human attention is most valuable in a review workflow.

---

## Manual Interventions

1. **Tesseract.js server-side setup** — Required webpack alias (`canvas: false`, `encoding: false`) in `next.config.js` to prevent browser bundling of the Node.js-only library
2. **SQLite JSON columns** — Prisma SQLite doesn't support native JSON type; confidence scores stored as `String` with manual `JSON.stringify/parse` helpers
3. **Next.js 15 params** — `params` are now `Promise<{id: string}>` in Next.js 15 App Router; required `await params` in all route handlers
4. **Recharts dark mode** — Recharts doesn't auto-detect theme; all chart colors, tooltip styles, and axis colors hardcoded to match the dark HSL design system

---

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Provider-swappable via env var | Groq is free and fast for demos; OpenAI for higher accuracy |
| `response_format: { type: 'json_object' }` | Forces strict JSON output on OpenAI-compatible models |
| Upsert for extracted records | Re-extraction replaces old data cleanly without orphaned rows |
| Validation issues cleared on re-extract | Ensures fresh validation state after any edit |
| `needs_review` on any warning | Conservative — anything uncertain goes to human review |
| Demo mode heuristics | Enables zero-dependency demo for non-technical evaluators |
| AuditLog is append-only | Immutable trail — never updated, only inserted |
| `force-dynamic` on all pages | Prevents stale Next.js cache — all data is live from DB |

---

## Confidence Threshold Rationale

| Range | Label | UI treatment |
|-------|-------|-------------|
| ≥ 0.85 | High | Green indicator, no badge |
| 0.65–0.84 | Medium | Amber indicator, warning badge |
| < 0.65 | Low | Red indicator, error-style badge, field highlighted |

The 0.65 threshold was chosen because in OCR+LLM pipelines, scores below this typically indicate the model was guessing rather than reading. At 0.65+, the value is usually correct but may have a typo. At 0.85+, it's almost certainly right.

---

## Extraction Accuracy Notes

- **Best**: Printed documents with clear machine numbers and dates → ~90%+ field confidence
- **Good**: Semi-structured handwritten forms → ~70-80% field confidence  
- **Challenging**: Cursive handwriting, rotated documents, faded ink → <65%, triggers review
- **Demo mode**: ~60-80% simulated confidence via regex heuristics on sample text
