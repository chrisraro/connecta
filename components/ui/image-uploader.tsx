"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { resolveImageUrl } from "@/lib/utils";

interface ImageUploaderProps {
    value?: string;
    onChange: (url: string) => void;
    onRemove?: () => void;
    className?: string;
    placeholder?: string;
}

export function ImageUploader({ value, onChange, onRemove, className, placeholder = "Upload Image" }: ImageUploaderProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const generateUploadUrl = useMutation(api.images.generateUploadUrl);
    
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
        
        // Create local preview URL for immediate display
        const localUrl = URL.createObjectURL(file);
        setLocalPreviewUrl(localUrl);
        
        try {
            // 1. Get a short-lived upload URL from Convex
            const postUrl = await generateUploadUrl();

            // 2. POST the file to the URL
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!result.ok) throw new Error("Upload failed");

            const { storageId } = await result.json();
            
            // Clear local preview and set the storage ID
            setLocalPreviewUrl(null);
            URL.revokeObjectURL(localUrl);
            onChange(storageId);
        } catch (err) {
            console.error(err);
            setLocalPreviewUrl(null);
            URL.revokeObjectURL(localUrl);
            alert("Failed to upload image.");
        } finally {
            setIsLoading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const triggerUpload = () => inputRef.current?.click();

    if (displayUrl) {
        return (
            <div className={`relative w-32 h-32 rounded-lg overflow-hidden border border-border group ${className}`}>
                <img src={displayUrl} alt="Uploaded" className="w-full h-full object-cover" />
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
                    </>
                )}
            </Button>
        </div>
    );
}
