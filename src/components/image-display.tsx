'use client';

import Image from 'next/image';

interface ImageDisplayProps {
  src: string;
  alt: string;
}

export function ImageDisplay({ src, alt }: ImageDisplayProps) {
  return (
    <div className="relative w-full h-auto border rounded-lg overflow-hidden">
      <Image
        src={src}
        alt={alt}
        width={800}
        height={600}
        className="w-full h-auto"
        data-ai-hint="document id"
      />
    </div>
  );
}
