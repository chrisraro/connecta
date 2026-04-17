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
    const [displayUrl, setDisplayUrl] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);
    const generateUploadUrl = useMutation(api.images.generateUploadUrl);
    
    // Get the actual URL for display
    const storageUrl = useQuery(
        api.images.getImageUrl,
        value && !value.startsWith("http") && !value.startsWith("data:") ? { storageId: value } : "skip"
    );
    
    useEffect(() => {
        if (value?.startsWith("http") || value?.startsWith("data:")) {
            setDisplayUrl(value);
        } else if (storageUrl) {
            setDisplayUrl(storageUrl);
        } else if (value) {
            setDisplayUrl(resolveImageUrl(value));
        } else {
            setDisplayUrl("");
        }
    }, [value, storageUrl]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            return;
        }

        setIsLoading(true);
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
            
            // For simplicity in this app, we will use the storageId as the value.
            // In a real app, you might want to fetch the actual URL, 
            // but Convex storage IDs can be used with a proxy or transformed.
            // Here we'll treat the storageId as the persistent identifier.
            // To display it, we'll need a way to turn storageId into a URL.
            // Let's assume for now we want to store the final public URL if possible,
            // or just use a helper. 
            
            // To keep it consistent with existing code that expects a URL:
            // We'll pass the storageId and let the backend/components handle resolution.
            // BUT, to show the preview IMMEDIATELY, we'll use the storage ID or a temporary local URL.
            
            onChange(storageId);
        } catch (err) {
            console.error(err);
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
