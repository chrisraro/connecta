import { ImageUploader } from "@/components/ui/image-uploader";

/** Step 8 (skippable): profile photo. */
export function PhotoStep({
  avatarUrl,
  onChange,
}: {
  avatarUrl: string;
  onChange: (url: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 pt-4">
      <p className="text-center text-sm text-muted-foreground">
        Upload a professional photo. This appears on your public profile.
      </p>
      <div className="h-40 w-40">
        <ImageUploader
          value={avatarUrl}
          onChange={onChange}
          onRemove={() => onChange("")}
          placeholder="Upload photo"
          className="h-full w-full rounded-full"
        />
      </div>
      <p className="text-xs text-muted-foreground">You can skip this and add it later in the builder.</p>
    </div>
  );
}
