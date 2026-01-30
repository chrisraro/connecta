"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface ImageUploaderProps {
    value?: string;
    onChange: (base64: string) => void;
    onRemove?: () => void;
    className?: string;
    placeholder?: string;
}

export function ImageUploader({ value, onChange, onRemove, className, placeholder = "Upload Image" }: ImageUploaderProps) {
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // rudimentary check for image type
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            return;
        }

        // Limit size to ~2MB for Base64 (browser performance safe-ish zone)
        if (file.size > 2 * 1024 * 1024) {
            alert("File is too large. Please upload an image under 2MB.");
            return;
        }

        setIsLoading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            setIsLoading(false);
            if (typeof reader.result === "string") {
                onChange(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const triggerUpload = () => inputRef.current?.click();

    if (value) {
        return (
            <div className={`relative w-32 h-32 rounded-lg overflow-hidden border border-border group ${className}`}>
                <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onRemove) onRemove();
                            else onChange(""); // clear if no remove handler
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
