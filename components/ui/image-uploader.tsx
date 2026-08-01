"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2, Info } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { resolveImageUrl } from "@/lib/utils";
import { compressImage, formatFileSize } from "@/lib/image-compression";
import { useUser } from "@clerk/nextjs";

interface ImageUploaderProps {
    value?: string;
    onChange: (url: string) => void;
    onRemove?: () => void;
    className?: string;
    placeholder?: string;
}

export function ImageUploader({ value, onChange, onRemove, className, placeholder = "Upload Image" }: ImageUploaderProps) {
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
    const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const generateUploadUrl = useMutation(api.images.generateUploadUrl);

    useEffect(() => {
        return () => {
            if (localPreviewUrl) {
                URL.revokeObjectURL(localPreviewUrl);
            }
        };
    }, [localPreviewUrl]);

    // Get the actual URL for display from Convex storage
    const storageUrl = useQuery(
        api.images.getImageUrl,
        value && !value.startsWith("http") && !value.startsWith("data:") && !value.startsWith("blob:") ? { storageId: value } : "skip"
    );
    
    // Determine the display URL
    const getDisplayUrl = () => {
        if (localPreviewUrl) return localPreviewUrl;
        if (value?.startsWith("http") || value?.startsWith("data:") || value?.startsWith("blob:")) return value;
        if (storageUrl) return storageUrl;
        if (value) return resolveImageUrl(value);
        return "";
    };
    
    const displayUrl = getDisplayUrl();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            return;
        }

        setIsLoading(true);
        setCompressionInfo(null);
        
        try {
            console.log("Starting image upload...", { fileName: file.name, size: file.size, type: file.type });
            
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
                    type: 'image/jpeg',
                });
                
                setCompressionInfo(
                    `Compressed: ${formatFileSize(compressionResult.originalSize)} → ${formatFileSize(compressionResult.compressedSize)} (${compressionResult.compressionRatio.toFixed(0)}% reduction)`
                );
                
                console.log('Compression result:', compressionResult);
            }
            
            // Create local preview URL for immediate display
            const localUrl = URL.createObjectURL(fileToUpload);
            setLocalPreviewUrl(localUrl);
            
            // 1. Get a short-lived upload URL from Convex
            if (!user?.id) {
                throw new Error("User not authenticated");
            }
            
            const postUrl = await generateUploadUrl({
                clerkId: user.id,
            });
            console.log("Got upload URL:", postUrl);

            // 2. POST the file to the URL
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": fileToUpload.type },
                body: fileToUpload,
            });

            console.log("Upload response status:", result.status);
            
            if (!result.ok) {
                const errorText = await result.text();
                console.error("Upload failed:", errorText);
                throw new Error(`Upload failed: ${result.status} ${errorText}`);
            }

            const { storageId } = await result.json();
            console.log("Upload successful, storageId:", storageId);
            
            // Clear local preview and set the storage ID
            setLocalPreviewUrl(null);
            URL.revokeObjectURL(localUrl);
            onChange(storageId);
        } catch (err) {
            console.error("Image upload error:", err);
            setLocalPreviewUrl(null);
            
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            alert(`Failed to upload image: ${errorMessage}`);
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
            <div className={`relative w-32 h-32 rounded-lg overflow-hidden border border-border group ${className}`}>
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
