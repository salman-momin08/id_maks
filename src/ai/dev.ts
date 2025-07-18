import { config } from 'dotenv';
config();

import '@/ai/flows/mask-pii.ts';
import '@/ai/flows/detect-pii.ts';
import '@/ai/flows/redact-aadhaar.ts';
