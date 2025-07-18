// src/ai/flows/redact-aadhaar.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for redacting Aadhaar card images.
 *
 * - redactAadhaar - A function that accepts an Aadhaar card image and returns a redacted version.
 * - RedactAadhaarInput - The input type for the redactAadhaar function.
 * - RedactAadhaarOutput - The return type for the redactAadhaar function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {detectPii} from './detect-pii';

const RedactAadhaarInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RedactAadhaarInput = z.infer<typeof RedactAadhaarInputSchema>;

const RedactAadhaarOutputSchema = z.object({
  redactedPhotoDataUri: z
    .string()
    .describe('The redacted photo, as a data URI.'),
});
export type RedactAadhaarOutput = z.infer<typeof RedactAadhaarOutputSchema>;

export async function redactAadhaar(input: RedactAadhaarInput): Promise<RedactAadhaarOutput> {
  return redactAadhaarFlow(input);
}

const redactAadhaarFlow = ai.defineFlow(
  {
    name: 'redactAadhaarFlow',
    inputSchema: RedactAadhaarInputSchema,
    outputSchema: RedactAadhaarOutputSchema,
  },
  async input => {
    // 1. Detect PII regions using the existing detectPii flow
    const piiResult = await detectPii(input);
    const piiElements = piiResult.piiElements;

    if (!piiElements || piiElements.length === 0) {
      // No PII found, return original image
      return {redactedPhotoDataUri: input.photoDataUri};
    }
    
    // 2. Construct detailed instructions for blurring and text replacement.
    const redactionInstructions: string[] = [];
    const textReplacementInstructions: string[] = [];

    piiElements.forEach(p => {
        if (!p.bounding_box) return;
        const { x1, y1, x2, y2 } = p.bounding_box;
        const bboxString = `(x1: ${x1}, y1: ${y1}, x2: ${x2}, y2: ${y2})`;

        if (p.type === 'Photo') {
            redactionInstructions.push(`- Apply a Gaussian blur (strength: 12px) to the area within bounding box ${bboxString}.`);
        } else if (p.type === 'Name') {
            textReplacementInstructions.push(`- Replace the text "${p.value}" inside ${bboxString} with "XXXX XXXX".`);
        } else if (p.type === 'Year of Birth') {
            textReplacementInstructions.push(`- Replace the text "${p.value}" inside ${bboxString} with "XXXX".`);
        } else if (p.type === 'Aadhaar Number') {
            textReplacementInstructions.push(`- Replace the text "${p.value}" (the first 8 digits of the Aadhaar number) inside ${bboxString} with "XXXX XXXX". The last 4 digits must remain untouched.`);
        }
        // Gender is intentionally left out to keep it as-is.
    });


    const prompt = `
You are an expert document recreation specialist. Your task is to create a visually perfect, high-fidelity replica of the provided Aadhaar card image with specific modifications. You must not alter any part of the image except for the specific instructions below. The final image must have the same dimensions, quality, and background as the original.

**MODIFICATION INSTRUCTIONS:**

1.  **Blur Photo:**
    ${redactionInstructions.join('\n    ')}

2.  **Replace Text with Placeholders:**
    For each item below, find the original text inside its bounding box and replace it with the new placeholder text. You MUST use the following styling for the placeholder text:
    - **Font Family**: 'Inter', 'Arial', sans-serif (use a clean, neutral sans-serif font).
    - **Font Weight**: 600 (semi-bold).
    - **Font Size**: You MUST exactly match the font size of the original text being replaced.
    - **Color**: #222222 (a dark, neutral grey).
    - **Letter Spacing**: 0.5px.
    - **Text Transform**: Uppercase.
    - **Alignment**: Left-aligned to the original text's starting position.

    **Text to Replace:**
    ${textReplacementInstructions.join('\n    ')}

**CRITICAL RULES:**
- Do not draw boxes or borders around the redacted areas.
- The 'Gender' field should remain unchanged.
- The last 4 digits of the Aadhaar number must remain visible and untouched.
- All other text, logos, and design elements of the original document must be preserved perfectly.
`;

    // 3. Use an image generation model to perform the redaction
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.photoDataUri}},
        {text: prompt},
      ],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    if (!media?.url) {
        throw new Error("Image generation failed to return a redacted image.");
    }

    return {redactedPhotoDataUri: media.url};
  }
);
