/**
 * AI Extraction Service
 * Provider-swappable: openai | groq | anthropic | openrouter
 * Returns structured manufacturing record + per-field confidence scores.
 */

import { ExtractionResult, ManufacturingRecord, ConfidenceMap, FieldConfidence } from '../types';
import { sleep } from '../utils';

// ── Extraction prompt (v1) ────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert data extraction assistant for manufacturing operations.
Your task is to extract structured data from OCR text of handwritten or printed manufacturing work order documents.

RULES:
- Extract ONLY what is visible in the text. Do not invent values.
- Return ONLY valid JSON. No markdown, no explanations, no code fences.
- For each field provide: value (extracted value or null), confidence (0.0-1.0), source ("llm" always)
- Confidence reflects your certainty: 0.95+ = very clear, 0.7-0.94 = likely correct, 0.4-0.69 = uncertain, <0.4 = guessing
- Dates must be ISO format YYYY-MM-DD if extractable
- Shift values: A, B, C, or Night
- Machine numbers often follow patterns like MC-101, WLD-01, ASM-07
- Work order numbers often follow WO-XXXXX pattern
- quantityProduced and timeTaken must be numeric (float/int) or null`;

const USER_PROMPT_TEMPLATE = (ocrText: string) => `
Extract manufacturing record fields from this OCR text:

---OCR TEXT START---
${ocrText}
---OCR TEXT END---

Return this exact JSON structure (fill all fields):
{
  "date": { "value": "YYYY-MM-DD or null", "confidence": 0.0, "source": "llm" },
  "shift": { "value": "A|B|C|Night or null", "confidence": 0.0, "source": "llm" },
  "employeeNumber": { "value": "string or null", "confidence": 0.0, "source": "llm" },
  "operationCode": { "value": "string or null", "confidence": 0.0, "source": "llm" },
  "machineNumber": { "value": "string or null", "confidence": 0.0, "source": "llm" },
  "workOrderNumber": { "value": "string or null", "confidence": 0.0, "source": "llm" },
  "quantityProduced": { "value": number_or_null, "confidence": 0.0, "source": "llm" },
  "timeTaken": { "value": number_or_null, "confidence": 0.0, "source": "llm" },
  "batchNumber": { "value": "string or null", "confidence": 0.0, "source": "llm" },
  "productCode": { "value": "string or null", "confidence": 0.0, "source": "llm" },
  "remarks": { "value": "string or null", "confidence": 0.0, "source": "llm" }
}`;

// ── Provider configurations ────────────────────────────────────
interface LLMConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  maxTokens: number;
}

function getLLMConfig(): LLMConfig {
  const provider = process.env.AI_PROVIDER ?? 'openai';

  switch (provider) {
    case 'groq':
      return {
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY ?? '',
        model: process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant',
        maxTokens: 1024,
      };
    case 'anthropic':
      return {
        baseURL: 'https://api.anthropic.com/v1',
        apiKey: process.env.ANTHROPIC_API_KEY ?? '',
        model: process.env.ANTHROPIC_MODEL ?? 'claude-3-haiku-20240307',
        maxTokens: 1024,
      };
    case 'openrouter':
      return {
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY ?? '',
        model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
        maxTokens: 1024,
      };
    default: // openai
      return {
        baseURL: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY ?? '',
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        maxTokens: 1024,
      };
  }
}

// ── Call the LLM via OpenAI-compatible API ─────────────────────
async function callLLM(ocrText: string, config: LLMConfig): Promise<string> {
  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT_TEMPLATE(ocrText) },
      ],
      max_tokens: config.maxTokens,
      temperature: 0.1, // Low temp for deterministic extraction
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API error ${response.status}: ${err}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? '';
}

// ── Parse and validate LLM JSON response ──────────────────────
function parseLlmResponse(raw: string): ConfidenceMap {
  let parsed: Record<string, unknown>;

  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse LLM JSON response: ${cleaned.slice(0, 200)}`);
  }

  const EXPECTED_FIELDS = [
    'date', 'shift', 'employeeNumber', 'operationCode', 'machineNumber',
    'workOrderNumber', 'quantityProduced', 'timeTaken', 'batchNumber', 'productCode', 'remarks',
  ];

  const confidenceMap: ConfidenceMap = {};

  for (const field of EXPECTED_FIELDS) {
    const raw = parsed[field] as { value?: unknown; confidence?: unknown; source?: unknown } | null;

    if (raw && typeof raw === 'object') {
      confidenceMap[field] = {
        value: raw.value ?? null,
        confidence: typeof raw.confidence === 'number'
          ? Math.min(1, Math.max(0, raw.confidence))
          : 0.5,
        source: (raw.source as FieldConfidence['source']) ?? 'llm',
      } as FieldConfidence;
    } else {
      confidenceMap[field] = { value: null, confidence: 0, source: 'llm' };
    }
  }

  return confidenceMap;
}

// ── Build ManufacturingRecord from ConfidenceMap ───────────────
function buildRecord(map: ConfidenceMap): ManufacturingRecord {
  const get = (field: string) => map[field]?.value ?? null;

  return {
    date: get('date') as string | null,
    shift: get('shift') as string | null,
    employeeNumber: get('employeeNumber') as string | null,
    operationCode: get('operationCode') as string | null,
    machineNumber: get('machineNumber') as string | null,
    workOrderNumber: get('workOrderNumber') as string | null,
    quantityProduced: get('quantityProduced') as number | null,
    timeTaken: get('timeTaken') as number | null,
    batchNumber: get('batchNumber') as string | null,
    productCode: get('productCode') as string | null,
    remarks: get('remarks') as string | null,
  };
}

// ── Compute overall confidence ─────────────────────────────────
function computeOverallConfidence(map: ConfidenceMap): number {
  const WEIGHTED_FIELDS: Record<string, number> = {
    date: 1.5, workOrderNumber: 2.0, machineNumber: 1.5, quantityProduced: 2.0,
    shift: 1.0, employeeNumber: 1.0, operationCode: 1.0, timeTaken: 1.0,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [field, weight] of Object.entries(WEIGHTED_FIELDS)) {
    const score = map[field]?.confidence ?? 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? +(weightedSum / totalWeight).toFixed(3) : 0;
}

// ── Main extraction function (with retry) ─────────────────────
export async function extractFromOcr(ocrText: string): Promise<ExtractionResult> {
  const config = getLLMConfig();
  const startTime = Date.now();
  let retryCount = 0;
  let rawResponse = '';

  const MAX_RETRIES = 2;

  while (retryCount <= MAX_RETRIES) {
    try {
      rawResponse = await callLLM(ocrText, config);
      const confidenceScores = parseLlmResponse(rawResponse);
      const record = buildRecord(confidenceScores);
      const overallConfidence = computeOverallConfidence(confidenceScores);

      return {
        record,
        confidenceScores,
        overallConfidence,
        rawLlmResponse: rawResponse,
        extractionModel: config.model,
        durationMs: Date.now() - startTime,
        retryCount,
      };
    } catch (error) {
      retryCount++;
      console.error(`[Extraction] Attempt ${retryCount} failed:`, error);

      if (retryCount > MAX_RETRIES) {
        // Return fallback empty result rather than crashing
        const emptyMap: ConfidenceMap = {};
        const fields = ['date','shift','employeeNumber','operationCode','machineNumber',
          'workOrderNumber','quantityProduced','timeTaken','batchNumber','productCode','remarks'];
        for (const f of fields) emptyMap[f] = { value: null, confidence: 0, source: 'llm' };

        return {
          record: buildRecord(emptyMap),
          confidenceScores: emptyMap,
          overallConfidence: 0,
          rawLlmResponse: rawResponse,
          extractionModel: config.model,
          durationMs: Date.now() - startTime,
          retryCount,
        };
      }

      await sleep(1000 * retryCount);
    }
  }

  throw new Error('Extraction failed after all retries');
}

/**
 * Demo mode: simulate extraction without a real API key.
 * Used when AI_PROVIDER is not configured or key is missing.
 */
export async function extractFromOcrDemo(ocrText: string): Promise<ExtractionResult> {
  await sleep(1500); // simulate latency

  const text = ocrText.toLowerCase();

  // Heuristic field extraction for demo
  const dateMatch = ocrText.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);
  const shiftMatch = text.match(/shift[:\s]+([abcABC]|night)/i);
  const empMatch = ocrText.match(/emp[#\-:\s]+([A-Z0-9\-]+)/i);
  const woMatch = ocrText.match(/W[Oo][:\-\s]+([A-Z0-9\-]+)/);
  const machineMatch = ocrText.match(/(MC|WLD|ASM|CNC)[:\-\s]*(\d{2,4})/i);
  const qtyMatch = ocrText.match(/qty[:\s]+(\d+)/i) ?? ocrText.match(/quantity[:\s]+(\d+)/i);
  const timeMatch = ocrText.match(/time[:\s]+([\d.]+)\s*h/i);
  const opMatch = ocrText.match(/op[:\-\s]+([A-Z0-9\-]+)/i);

  const confidenceScores: ConfidenceMap = {
    date: { value: dateMatch ? dateMatch[1] : '2024-01-15', confidence: dateMatch ? 0.82 : 0.3, source: 'llm' },
    shift: { value: shiftMatch ? shiftMatch[1].toUpperCase() : 'A', confidence: shiftMatch ? 0.88 : 0.4, source: 'llm' },
    employeeNumber: { value: empMatch ? empMatch[1] : 'EMP-042', confidence: empMatch ? 0.79 : 0.35, source: 'llm' },
    operationCode: { value: opMatch ? opMatch[1] : 'OP-001', confidence: opMatch ? 0.75 : 0.45, source: 'llm' },
    machineNumber: { value: machineMatch ? `${machineMatch[1]}-${machineMatch[2]}` : 'MC-101', confidence: machineMatch ? 0.91 : 0.38, source: 'llm' },
    workOrderNumber: { value: woMatch ? woMatch[1] : 'WO-12345', confidence: woMatch ? 0.87 : 0.42, source: 'llm' },
    quantityProduced: { value: qtyMatch ? parseInt(qtyMatch[1]) : 250, confidence: qtyMatch ? 0.84 : 0.40, source: 'llm' },
    timeTaken: { value: timeMatch ? parseFloat(timeMatch[1]) : 4.5, confidence: timeMatch ? 0.80 : 0.35, source: 'llm' },
    batchNumber: { value: null, confidence: 0.1, source: 'llm' },
    productCode: { value: null, confidence: 0.1, source: 'llm' },
    remarks: { value: null, confidence: 0.1, source: 'llm' },
  };

  return {
    record: buildRecord(confidenceScores),
    confidenceScores,
    overallConfidence: computeOverallConfidence(confidenceScores),
    rawLlmResponse: JSON.stringify(confidenceScores, null, 2),
    extractionModel: 'demo-heuristic',
    durationMs: 1500,
    retryCount: 0,
  };
}
