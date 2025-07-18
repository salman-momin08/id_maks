// mask-pii.ts
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
import { googleAI } from '@genkit-ai/googleai';
import wav from 'wav';

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
    .describe("The masked photo, as a data URI."),
});
export type MaskPIIOutput = z.infer<typeof MaskPIIOutputSchema>;

export async function maskPII(input: MaskPIIInput): Promise<MaskPIIOutput> {
  return maskPIIFlow(input);
}

const piiDetectionPrompt = ai.definePrompt({
  name: 'piiDetectionPrompt',
  input: {schema: MaskPIIInputSchema},
  output: {schema: z.object({
    piiRegions: z.array(z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      type: z.string(),
    })).describe('Array of PII regions with coordinates and type.')
  })},
  prompt: `You are an expert at detecting Personally Identifiable Information (PII) in images of documents.

  Given the following image of a document, identify the regions containing PII.  PII includes full names, addresses, dates of birth, Aadhaar numbers, phone numbers, and email addresses.

  Return a JSON array of bounding box coordinates for each PII region detected in the following format:
  [{
    "x": x coordinate of the top-left corner,
    "y": y coordinate of the top-left corner,
    "width": width of the bounding box,
    "height": height of the bounding box,
    "type": type of PII detected (e.g., name, address, dob, aadhaar, phone, email)
  }]

  Image: {{media url=photoDataUri}}
  `,
});

const maskPIIFlow = ai.defineFlow(
  {
    name: 'maskPIIFlow',
    inputSchema: MaskPIIInputSchema,
    outputSchema: MaskPIIOutputSchema,
  },
  async input => {
    // 1. Detect PII regions using the piiDetectionPrompt
    const detectionResult = await piiDetectionPrompt(input);

    //console.log("detectionResult", detectionResult);

    // 2. Generate a prompt to mask the detected PII regions.
    const maskPrompt = `Here is the original image: {{media url=photoDataUri}}.  Here are the PII regions that must be blacked out:
    ${JSON.stringify(detectionResult.output?.piiRegions)}.

    Return the data URI of the masked image.
    `
    //console.log("maskPrompt", maskPrompt);

    const {media} = await ai.generate({
      // IMPORTANT: ONLY the googleai/gemini-2.0-flash-preview-image-generation model is able to generate images. You MUST use exactly this model to generate images.
      model: 'googleai/gemini-2.0-flash-preview-image-generation',

      // simple prompt
      //prompt: 'Generate an image of a cat',
      // OR, existing images can be provided in-context for editing, character reuse, etc.
      prompt: [
        {media: {url: input.photoDataUri}},
        {text: maskPrompt},
      ],

      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
      },
    });

    //console.log(media.url);
    return {maskedPhotoDataUri: media.url!};
  }
);


