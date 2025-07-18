'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { DetectPiiOutput } from '@/ai/flows/detect-pii';

type PiiDetection = DetectPiiOutput['piiElements'][0];

interface ImageDisplayProps {
  src: string;
  alt: string;
  detections: PiiDetection[];
}

interface Dimensions {
  width: number;
  height: number;
}

export function ImageDisplay({ src, alt, detections }: ImageDisplayProps) {
  const [originalDims, setOriginalDims] = useState<Dimensions | null>(null);

  useEffect(() => {
    if (src) {
      const img = new window.Image();
      img.onload = () => {
        setOriginalDims({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        console.error("Failed to load image to get dimensions.");
        setOriginalDims(null);
      }
      img.src = src;
    }
  }, [src]);

  return (
    <div className="relative w-full h-auto border rounded-lg overflow-hidden">
      <Image
        src={src}
        alt={alt}
        width={originalDims?.width || 800}
        height={originalDims?.height || 600}
        className="w-full h-auto"
        data-ai-hint="document id"
      />
      {originalDims && detections.map((detection, index) => {
        if (!detection.bounding_box) return null;
        const { x1, y1, x2, y2 } = detection.bounding_box;

        const style = {
          position: 'absolute' as const,
          left: `${(x1 / originalDims.width) * 100}%`,
          top: `${(y1 / originalDims.height) * 100}%`,
          width: `${((x2 - x1) / originalDims.width) * 100}%`,
          height: `${((y2 - y1) / originalDims.height) * 100}%`,
        };

        return (
          <div
            key={index}
            className="absolute border-2 border-green-500 rounded-sm bg-green-500/20 group"
            style={style}
            title={`${detection.type}: ${detection.value}`}
          >
            <div className="absolute -top-6 left-0 text-xs bg-green-500 text-white px-1 py-0.5 rounded-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {detection.type}
            </div>
          </div>
        );
      })}
    </div>
  );
}
