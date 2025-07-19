'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Download, Loader2, FileImage, X } from 'lucide-react';
import { ImageDisplay } from '@/components/image-display';

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
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
      reader.onloadstart = () => setIsLoading(true);
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setOriginalImage(dataUri);
        setIsLoading(false);
      };
      reader.onerror = () => {
        setIsLoading(false);
        toast({
          title: 'File Error',
          description: 'Failed to read the file.',
          variant: 'destructive',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    if (!originalImage) return;
    const link = document.createElement('a');
    link.href = originalImage;
    link.download = 'uploaded-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleReset = () => {
    setOriginalImage(null);
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
                  Drag & drop an image or click to select a file to get started.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <UploadCloud className="mr-2" />}
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
                  <CardDescription>This is the image you uploaded.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageDisplay src={originalImage} alt="Original document" />
                </CardContent>
              </Card>

              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                    <CardDescription>Actions you can perform on the image.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                     <p className="text-sm text-muted-foreground">
                       Connect this to your backend to process the image.
                     </p>
                      <Button onClick={handleDownload}>
                        <Download className="mr-2"/>
                        Download Image
                      </Button>
                      <Button variant="outline" onClick={handleReset}>
                        <X className="mr-2"/>
                        Upload Another
                      </Button>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
