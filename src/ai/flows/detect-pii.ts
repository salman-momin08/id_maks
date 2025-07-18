// src/ai/flows/detect-pii.ts
'use server';

/**
 * @fileOverview Detects Personally Identifiable Information (PII) from a document image.
 *
 * - detectPii - A function that handles the PII detection process.
 * - DetectPiiInput - The input type for the detectPii function.
 * - DetectPiiOutput - The return type for the detectPii function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectPiiInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DetectPiiInput = z.infer<typeof DetectPiiInputSchema>;

const PiiDetectionResultSchema = z.object({
  type: z.string().describe('The type of PII detected (e.g., Name, Year of Birth, Gender, Aadhaar Number, Photo, Email).'),
  value: z.string().describe('The detected PII value. For Aadhaar, only the first 8 digits. For Photo, this can be "face".'),
  bounding_box: z.object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
  }).describe('The bounding box coordinates of the detected PII in the image.'),
});

const DetectPiiOutputSchema = z.object({
  piiElements: z.array(PiiDetectionResultSchema).describe('An array of detected PII elements with their types, values, and bounding box coordinates.'),
});

export type DetectPiiOutput = z.infer<typeof DetectPiiOutputSchema>;


export async function detectPii(input: DetectPiiInput): Promise<DetectPiiOutput> {
  return detectPiiFlow(input);
}

const detectPiiPrompt = ai.definePrompt({
  name: 'detectPiiPrompt',
  input: {schema: DetectPiiInputSchema},
  output: {schema: DetectPiiOutputSchema},
  prompt: `You are a highly specialized data protection officer with expertise in Optical Character Recognition (OCR) and Personally Identifiable Information (PII) detection from document images, specifically Indian Aadhaar cards.

  Your task is to meticulously analyze the provided document image and identify the following specific PII types:
  - Name
  - Year of Birth
  - Gender
  - Aadhaar Number
  - Photo (the main portrait of the person)

  For each piece of PII you find:
  1.  Extract the exact text value.
  2.  Identify its type from the list above.
  3.  Determine the precise bounding box coordinates (x1, y1, x2, y2) that enclose the PII on the image.

  **CRITICAL INSTRUCTIONS for specific fields:**
  - **Aadhaar Number**: An Aadhaar number is a 12-digit number, often formatted as XXXX XXXX XXXX. When you detect it, you MUST identify ONLY THE FIRST 8 DIGITS as the PII to be redacted. The 'value' field in your output for an Aadhaar Number MUST contain ONLY the first 8 digits. The 'bounding_box' MUST ONLY cover the area of these first 8 digits.
  - **Photo**: Identify the main portrait photo on the card. The 'value' can be "face" or "photo". The 'bounding_box' must enclose the entire photo area.

  Return your findings as a structured JSON array according to the output schema. If no PII is found, return an empty array.

  Document Image for Analysis: {{media url=photoDataUri}}
  `,
});

const detectPiiFlow = ai.defineFlow(
  {
    name: 'detectPiiFlow',
    inputSchema: DetectPiiInputSchema,
    outputSchema: DetectPiiOutputSchema,
  },
  async input => {
    const {output} = await detectPiiPrompt(input);
    return output!;
  }
);
