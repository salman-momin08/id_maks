'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import { detectPii, type DetectPiiOutput } from '@/ai/flows/detect-pii';
import { maskPII } from '@/ai/flows/mask-pii';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Download, Loader2, FileImage, X } from 'lucide-react';
import { ImageDisplay } from '@/components/image-display';
import { Badge } from '@/components/ui/badge';

type PiiDetection = DetectPiiOutput['piiElements'][0];

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [maskedImage, setMaskedImage] = useState<string | null>(null);
  const [piiDetections, setPiiDetections] = useState<PiiDetection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload an image file (e.g., PNG, JPG, WEBP).',
          variant: 'destructive',
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setOriginalImage(dataUri);
        processImage(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (dataUri: string) => {
    setIsLoading(true);
    setMaskedImage(null);
    setPiiDetections([]);
    try {
      // Run detection and masking in parallel
      const [piiResult, maskedResult] = await Promise.all([
        detectPii({ photoDataUri: dataUri }),
        maskPII({ photoDataUri: dataUri }),
      ]);

      if (piiResult?.piiElements) {
        setPiiDetections(piiResult.piiElements);
      }
      if (maskedResult?.maskedPhotoDataUri) {
        setMaskedImage(maskedResult.maskedPhotoDataUri);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: 'Processing Error',
        description: 'Failed to detect or mask PII. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!maskedImage) return;
    const link = document.createElement('a');
    link.href = maskedImage;
    link.download = 'masked-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleReset = () => {
    setOriginalImage(null);
    setMaskedImage(null);
    setPiiDetections([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="p-4 border-b shadow-sm sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold font-headline text-primary">PrivacyGuard</h1>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {!originalImage ? (
          <div className="flex items-center justify-center h-full max-w-4xl mx-auto pt-16">
            <Card className="w-full text-center p-8 border-2 border-dashed hover:border-primary transition-colors duration-300">
              <CardHeader>
                <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit mb-4">
                  <FileImage className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="font-headline text-2xl">Upload Your Document</CardTitle>
                <CardDescription>
                  Drag & drop an image or click to select a file. We'll automatically find and mask sensitive information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud className="mr-2" />
                  Upload Image
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>Original Image</CardTitle>
                  <CardDescription>PII detections are highlighted in green.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageDisplay src={originalImage} alt="Original document" detections={piiDetections} />
                </CardContent>
              </Card>

              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Masked Image</CardTitle>
                    <CardDescription>Sensitive information has been redacted.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading && (
                       <div className="aspect-video w-full flex flex-col items-center justify-center bg-muted/50 rounded-lg">
                         <Loader2 className="h-12 w-12 animate-spin text-primary mb-4"/>
                         <p className="text-muted-foreground">Scanning and masking PII...</p>
                       </div>
                    )}
                    {!isLoading && maskedImage && (
                      <Image
                        src={maskedImage}
                        alt="Masked document"
                        width={800}
                        height={600}
                        className="w-full h-auto rounded-lg border"
                        data-ai-hint="document id"
                      />
                    )}
                     {!isLoading && !maskedImage && (
                       <div className="aspect-video w-full flex items-center justify-center bg-destructive/10 text-destructive rounded-lg">
                         <p>Could not generate masked image.</p>
                       </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Detected Information</CardTitle>
                    <CardDescription>The following PII types were found and masked.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading && <p className="text-muted-foreground">Detecting PII...</p>}
                    {!isLoading && piiDetections.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {piiDetections.map((p, i) => (
                          <Badge key={i} variant="secondary">{p.type}</Badge>
                        ))}
                      </div>
                    )}
                    {!isLoading && piiDetections.length === 0 && (
                      <p className="text-muted-foreground">No PII was detected in this image.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
            <div className="flex justify-center gap-4 mt-8">
              <Button variant="outline" onClick={handleReset}>
                <X className="mr-2"/>
                Scan Another
              </Button>
              <Button onClick={handleDownload} disabled={!maskedImage || isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 animate-spin"/>
                ) : (
                  <Download className="mr-2"/>
                )}
                Download Masked Image
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
