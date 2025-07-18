// src/ai/flows/detect-pii.ts
'use server';

/**
 * @fileOverview Detects and masks Personally Identifiable Information (PII) from an image.
 *
 * - detectPii - A function that handles the PII detection and masking process.
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
  type: z.string().describe('The type of PII detected (e.g., Full Name, Address, Date of Birth, Aadhaar Number, Phone Number).'),
  value: z.string().describe('The detected PII value.'),
  bounding_box: z.object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
  }).optional().describe('The bounding box coordinates of the detected PII in the image. Optional because not all PII types might have a clear bounding box.'),
});

const DetectPiiOutputSchema = z.object({
  piiElements: z.array(PiiDetectionResultSchema).describe('An array of detected PII elements with their types, values, and bounding box coordinates (if available).'),
});

export type DetectPiiOutput = z.infer<typeof DetectPiiOutputSchema>;


export async function detectPii(input: DetectPiiInput): Promise<DetectPiiOutput> {
  return detectPiiFlow(input);
}

const detectPiiPrompt = ai.definePrompt({
  name: 'detectPiiPrompt',
  input: {schema: DetectPiiInputSchema},
  output: {schema: DetectPiiOutputSchema},
  prompt: `You are a highly specialized data protection officer with expertise in Optical Character Recognition (OCR) and Personally Identifiable Information (PII) detection from document images.

  Your task is to meticulously analyze the provided document image and identify the following specific PII types:
  - Full Name
  - Address
  - Date of Birth
  - Aadhaar Number
  - Phone Number

  For each piece of PII you find:
  1.  Extract the exact text value.
  2.  Identify its type from the list above.
  3.  Determine the precise bounding box coordinates (x1, y1, x2, y2) that enclose the PII on the image.

  **SPECIAL INSTRUCTIONS for Aadhaar Numbers:**
  - An Aadhaar number is a 12-digit number, often formatted as XXXX XXXX XXXX.
  - When you detect an Aadhaar Number, you must only identify the **first 8 digits** as the value to be redacted.
  - The 'value' field in your output for an Aadhaar Number should contain only the first 8 digits.
  - The 'bounding_box' for the Aadhaar Number should ONLY cover the area of these first 8 digits. The last 4 digits must be excluded from the bounding box and value.

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
