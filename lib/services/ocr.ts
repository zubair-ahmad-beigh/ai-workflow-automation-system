/**
 * OCR Service — wraps Tesseract.js for server-side text extraction
 * Runs in a Node.js API route, not the browser.
 */

import path from 'path';
import fs from 'fs';

export interface OcrResult {
  text: string;
  confidence: number; // 0–1
  durationMs: number;
  wordCount: number;
}

/**
 * Extract text from an image file using Tesseract.js.
 * Falls back gracefully if the file cannot be processed.
 */
export async function extractTextFromImage(filePath: string): Promise<OcrResult> {
  const start = Date.now();

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), 'public', filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  try {
    // Dynamic import to avoid bundling issues in Next.js
    const { createWorker, PSM } = await import('tesseract.js');

    const worker = await createWorker('eng', 1, {
      logger: () => {}, // suppress progress logs in production
    });

    await worker.setParameters({
      tessedit_char_whitelist: '',
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // Assume a single uniform block of text
    });

    const {
      data: { text, confidence },
    } = await worker.recognize(absolutePath);

    await worker.terminate();

    const cleanText = text
      .replace(/\f/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      text: cleanText,
      confidence: confidence / 100, // Tesseract returns 0–100
      durationMs: Date.now() - start,
      wordCount: cleanText.split(/\s+/).filter(Boolean).length,
    };
  } catch (error) {
    console.error('[OCR] Tesseract failed:', error);
    throw new Error(
      `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Preprocess text from OCR to clean common artifacts before LLM extraction.
 */
export function preprocessOcrText(rawText: string): string {
  return rawText
    // Fix common OCR errors
    .replace(/[|l1]/g, (match, offset, str) => {
      // Keep digits context
      const prev = str[offset - 1];
      const next = str[offset + 1];
      if (/\d/.test(prev) || /\d/.test(next)) return '1';
      return match;
    })
    .replace(/0/g, (match, offset, str) => {
      const prev = str[offset - 1];
      const next = str[offset + 1];
      if (/[A-Za-z]/.test(prev) || /[A-Za-z]/.test(next)) return 'O';
      return match;
    })
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}
