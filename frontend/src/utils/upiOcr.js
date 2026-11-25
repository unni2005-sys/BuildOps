import Tesseract from 'tesseract.js';

/**
 * Parses raw OCR text from a UPI screenshot to extract the Transaction ID / UTR.
 * Supports Google Pay, PhonePe, Paytm, BHIM, CRED, Amazon Pay, and standard bank UPI apps.
 */
export function parseUpiTransactionId(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // Clean lines and normalize common OCR character confusions
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const fullText = lines.join(' ');

  // 1. Explicit labeled 12-digit UTR / UPI Ref No / RRN
  // Matches:
  // "UPI transaction ID 432198765432"
  // "UPI Ref No: 4321 9876 5432"
  // "UTR: 432198765432"
  // "Bank Ref No: 432198765432"
  const labeledRegex = /(?:UPI\s*(?:transaction|ref|reference)?\s*(?:id|no|num|number)?|UTR|RRN|Bank\s*Ref(?:\s*No)?|Ref\s*(?:No|ID)?|Txn\s*(?:ID|Ref)?)[\s:#\.-]*([0-9\s]{12,16})/i;
  const matchLabeled = fullText.match(labeledRegex);
  if (matchLabeled && matchLabeled[1]) {
    const digits = matchLabeled[1].replace(/\s+/g, '');
    if (digits.length >= 12) {
      return {
        id: digits.slice(0, 12),
        type: 'UPI UTR / Ref No',
        confidence: 'high',
      };
    }
  }

  // 2. Line-by-line inspection (often the label is on line N and digits on line N+1)
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    if (/(UPI\s*transaction\s*ID|UPI\s*Ref|UTR|RRN|Transaction\s*ID|Ref\s*No)/i.test(currentLine)) {
      // Check current line for PhonePe ID starting with T
      const curTMatch = currentLine.match(/\b(T[0-9]{16,24})\b/i);
      if (curTMatch) {
        return {
          id: curTMatch[1].toUpperCase(),
          type: 'PhonePe Txn ID',
          confidence: 'high',
        };
      }

      // Check next line for PhonePe ID starting with T
      if (i + 1 < lines.length) {
        const nextTMatch = lines[i + 1].match(/\b(T[0-9]{16,24})\b/i);
        if (nextTMatch) {
          return {
            id: nextTMatch[1].toUpperCase(),
            type: 'PhonePe Txn ID',
            confidence: 'high',
          };
        }
      }

      // Check current line for 12-digit UTR
      const currentDigits = currentLine.replace(/\D/g, '');
      if (currentDigits.length === 12) {
        return {
          id: currentDigits,
          type: 'UPI UTR / Ref No',
          confidence: 'high',
        };
      }

      // Check next line if available for 12-digit UTR
      if (i + 1 < lines.length) {
        const nextDigits = lines[i + 1].replace(/\D/g, '');
        if (nextDigits.length === 12) {
          return {
            id: nextDigits,
            type: 'UPI UTR / Ref No',
            confidence: 'high',
          };
        }
      }
    }
  }

  // 3. PhonePe Transaction ID (starts with T followed by 18-24 digits)
  const phonePeMatch = fullText.match(/\b(T[0-9]{18,24})\b/i);
  if (phonePeMatch && phonePeMatch[1]) {
    return {
      id: phonePeMatch[1].toUpperCase(),
      type: 'PhonePe Txn ID',
      confidence: 'high',
    };
  }

  // 4. Google Pay Alphanumeric Transaction ID (e.g., CICAg...)
  const gpayAlnumMatch = fullText.match(/(?:Google\s*transaction\s*ID)[\s:#\.-]*([A-Za-z0-9_-]{12,28})/i);
  if (gpayAlnumMatch && gpayAlnumMatch[1]) {
    return {
      id: gpayAlnumMatch[1],
      type: 'Google Pay Txn ID',
      confidence: 'medium',
    };
  }

  // 5. Any standalone 12-digit number (standard NPCI UPI UTR length)
  // Avoid 10-digit phone numbers (like 9497290648) and timestamps
  const all12DigitMatches = fullText.match(/\b([0-9]{12})\b/g);
  if (all12DigitMatches && all12DigitMatches.length > 0) {
    // Prefer the first valid 12-digit sequence
    return {
      id: all12DigitMatches[0],
      type: '12-digit UTR',
      confidence: 'medium',
    };
  }

  // 6. Spaced 12-digit sequence e.g., "4032 9876 5432"
  const spaced12Match = fullText.match(/\b([0-9]{4}\s+[0-9]{4}\s+[0-9]{4})\b/);
  if (spaced12Match && spaced12Match[1]) {
    return {
      id: spaced12Match[1].replace(/\s+/g, ''),
      type: '12-digit UTR',
      confidence: 'medium',
    };
  }

  return null;
}

/**
 * Scans an image file using Tesseract.js and automatically extracts the UPI transaction ID / UTR.
 * @param {File|Blob|string} imageSource - The image file, blob, or URL.
 * @param {Function} [onProgress] - Optional callback receiving progress { status, progress }.
 * @returns {Promise<{ success: boolean, transactionId?: string, type?: string, rawText?: string, error?: string }>}
 */
export async function scanScreenshotForTransactionId(imageSource, onProgress) {
  try {
    const result = await Tesseract.recognize(imageSource, 'eng', {
      logger: (m) => {
        if (typeof onProgress === 'function' && m) {
          onProgress({
            status: m.status || 'processing',
            progress: typeof m.progress === 'number' ? Math.round(m.progress * 100) : 0,
          });
        }
      },
    });

    const rawText = result?.data?.text || '';
    const parsed = parseUpiTransactionId(rawText);

    if (parsed && parsed.id) {
      return {
        success: true,
        transactionId: parsed.id,
        type: parsed.type,
        confidence: parsed.confidence,
        rawText,
      };
    }

    return {
      success: false,
      rawText,
      error: 'No UPI transaction ID found in screenshot.',
    };
  } catch (err) {
    console.error('OCR processing error:', err);
    return {
      success: false,
      error: err.message || 'Failed to scan image.',
    };
  }
}
