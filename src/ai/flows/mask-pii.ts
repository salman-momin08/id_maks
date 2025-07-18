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
        .map(p => `- A ${p.type} located at bounding box (x1: ${p.bounding_box!.x1}, y1: ${p.bounding_box!.y1}, x2: ${p.bounding_box!.x2}, y2: ${p.bounding_box!.y2}).`)
        .join('\n');

    const prompt = `
You are an expert image editor specializing in high-fidelity document redaction.
Your task is to edit the provided image to mask specific areas containing Personally Identifiable Information (PII).

**Instructions:**
1.  Analyze the user-provided image.
2.  Cover the areas defined by the following bounding box coordinates with solid, opaque, black rectangles.
3.  Do NOT alter any other part of the image. The final image must be a perfect, high-quality copy of the original with only the specified areas redacted.
4.  Do not add any text, watermarks, or other artifacts. The redaction must be clean and precise.

**PII to redact:**
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
