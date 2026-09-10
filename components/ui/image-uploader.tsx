"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2, Info } from "lucide-react";
import { compressImage, formatFileSize } from "@/lib/image-compression";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import { useImageUpload } from "@/hooks/useImageUpload";
import { imageUrl as resolveImageUrl } from "@/lib/imageUrl";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  className?: string;
  placeholder?: string;
}

export function ImageUploader({
  value,
  onChange,
  onRemove,
  className,
  placeholder = "Upload Image",
}: ImageUploaderProps) {
  const uploadImage = useImageUpload();
  const [isLoading, setIsLoading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  // Derived, not queried: the bucket is public, so the display URL is a
  // string built from the stored path.
  const storageUrl = resolveImageUrl(value);

  // Determine the display URL
  const getDisplayUrl = () => {
    if (localPreviewUrl) return localPreviewUrl;
    if (value?.startsWith("http") || value?.startsWith("data:") || value?.startsWith("blob:"))
      return value;
    if (storageUrl) return storageUrl;
    if (value) return resolveImageUrl(value);
    return "";
  };

  const displayUrl = getDisplayUrl();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    setIsLoading(true);
    setCompressionInfo(null);

    try {
      console.log("Starting image upload...", {
        fileName: file.name,
        size: file.size,
        type: file.type,
      });

      // Compress image if over 1MB
      let fileToUpload = file;
      const ONE_MB = 1 * 1024 * 1024;

      if (file.size > ONE_MB) {
        console.log(`File size ${formatFileSize(file.size)} exceeds 1MB, compressing...`);
        const compressionResult = await compressImage(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          quality: 0.9,
          minWidthOrHeight: 800,
        });

        fileToUpload = new File([compressionResult.blob], file.name, {
          type: "image/jpeg",
        });

        setCompressionInfo(
          `Compressed: ${formatFileSize(compressionResult.originalSize)} → ${formatFileSize(compressionResult.compressedSize)} (${compressionResult.compressionRatio.toFixed(0)}% reduction)`,
        );

        console.log("Compression result:", compressionResult);
      }

      // Create local preview URL for immediate display
      const localUrl = URL.createObjectURL(fileToUpload);
      setLocalPreviewUrl(localUrl);

      // One call. The bucket rejects the wrong MIME type or an oversized
      // file BEFORE the object exists, so the separate validate-and-delete
      // step this used to need has nothing left to check. The client-side
      // compression in lib/image-compression.ts stays what it always was:
      // UX, not enforcement.
      const storageId = await uploadImage.mutateAsync(fileToUpload);

      setLocalPreviewUrl(null);
      URL.revokeObjectURL(localUrl);
      onChange(storageId);
      toast.success("Image uploaded");
    } catch (err) {
      console.error("Image upload error:", err);
      setLocalPreviewUrl(null);

      toast.error(toUserMessage(err));
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const triggerUpload = () => inputRef.current?.click();

  if (displayUrl) {
    // Only the Convex-resolved `storageUrl` query result is guaranteed
    // to be a *.convex.cloud host (the one allow-listed in
    // next.config.ts's remotePatterns). The local blob: preview shown
    // mid-upload and any raw http/data URL both skip Next's optimizer
    // instead of risking a thrown error on an unlisted host — same
    // pattern as components/templates/ProfileImage.tsx.
    const isOptimizable = displayUrl === storageUrl;
    return (
      <div
        className={`relative w-32 h-32 rounded-lg overflow-hidden border border-border group ${className}`}
      >
        <Image
          src={displayUrl}
          alt="Uploaded"
          fill
          sizes="128px"
          className="object-cover"
          unoptimized={!isOptimizable}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              if (onRemove) onRemove();
              else onChange("");
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full h-32 border-dashed flex flex-col gap-2 "
        onClick={triggerUpload}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <ImagePlus className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{placeholder}</span>
            <span className="text-[10px] text-muted-foreground">Max 1MB (auto-compressed)</span>
          </>
        )}
      </Button>
      {compressionInfo && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-blue-600 dark:text-blue-400">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{compressionInfo}</span>
        </div>
      )}
    </div>
  );
}
