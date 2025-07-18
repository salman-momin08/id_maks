'use server';
/**
 * @fileOverview This file defines a Genkit flow for detecting and masking PII in images.
 *
 * - maskPII - A function that accepts an image and returns the image with PII masked.
 * - MaskPIIInput - The input type for the maskPII function.
 * - MaskPIIOutput - The return type for the maskPII function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {detectPii} from './detect-pii';

const MaskPIIInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type MaskPIIInput = z.infer<typeof MaskPIIInputSchema>;

const MaskPIIOutputSchema = z.object({
  maskedPhotoDataUri: z
    .string()
    .describe('The masked photo, as a data URI.'),
});
export type MaskPIIOutput = z.infer<typeof MaskPIIOutputSchema>;

export async function maskPII(input: MaskPIIInput): Promise<MaskPIIOutput> {
  return maskPIIFlow(input);
}

const maskPIIFlow = ai.defineFlow(
  {
    name: 'maskPIIFlow',
    inputSchema: MaskPIIInputSchema,
    outputSchema: MaskPIIOutputSchema,
  },
  async input => {
    // 1. Detect PII regions using the existing detectPii flow
    const piiResult = await detectPii(input);
    const piiElements = piiResult.piiElements;

    if (!piiElements || piiElements.length === 0) {
      // No PII found, return original image
      return {maskedPhotoDataUri: input.photoDataUri};
    }
    
    // 2. Construct a detailed prompt for the image generation model
    const redactionInstructions = piiElements
        .filter(p => p.bounding_box)
        .map(p => `- The ${p.type} "${p.value}" located within bounding box (x1: ${p.bounding_box!.x1}, y1: ${p.bounding_box!.y1}, x2: ${p.bounding_box!.x2}, y2: ${p.bounding_box!.y2}).`)
        .join('\n');

    const prompt = `
You are an expert document editor with perfect accuracy. Your task is to edit the provided image to redact Personally Identifiable Information (PII) by replacing it with styled placeholder text.

**CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE EXACTLY:**

1.  Analyze the user-provided image carefully.
2.  For each piece of PII listed below, locate the exact text within its specified bounding box.
3.  You will replace the original text with a sequence of 'X' characters.
4.  **IT IS ESSENTIAL that you match the character count and spacing of the original text.** For example, a name like "Vijender Singh" must become "XXXXXXXX XXXXX" and a number like "3379 7203" must become "XXXX XXXX". Maintain the original spacing perfectly.
5.  The replacement 'X' text MUST be styled precisely according to these rules:
    - **Font Family**: 'Inter', 'Arial', sans-serif (use a clean, neutral sans-serif font).
    - **Font Weight**: 600 (semi-bold).
    - **Font Size**: You MUST exactly match the font size of the original text being replaced.
    - **Color**: #222222 (a dark, neutral grey).
    - **Letter Spacing**: 0.5px.
    - **Text Transform**: Uppercase.
    - **Alignment**: Left-aligned to the original text's starting position.
6.  **Crucially, you MUST NOT alter any other part of the image.** The background, surrounding text, logos, and document quality must remain identical to the original. The final image must be a perfect, high-fidelity copy with ONLY the specified text replaced according to the styling rules. Do not draw boxes or add any other artifacts.

**PII to find and replace with 'X's:**
${redactionInstructions}
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
        throw new Error("Image generation failed to return a masked image.");
    }

    return {maskedPhotoDataUri: media.url};
  }
);
