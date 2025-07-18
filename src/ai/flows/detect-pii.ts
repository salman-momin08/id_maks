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
  type: z.string().describe('The type of PII detected (e.g., name, address, date of birth, aadhaar number, phone number, email address).'),
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
  prompt: `You are an expert in detecting Personally Identifiable Information (PII) in images of documents. 

  Given an image of a document, identify and extract all PII elements, including but not limited to:
  - Full Name
  - Address
  - Date of Birth
  - Aadhaar Number (or similar national ID number)
  - Phone Number
  - Email Address (if present)

  For each detected PII element, determine its type and value. If possible, estimate the bounding box coordinates (x1, y1, x2, y2) of the PII element within the image. Return the results in a JSON array format as described in the output schema.

  Here is the document image: {{media url=photoDataUri}}
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
