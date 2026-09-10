"use client";

import { useMutation } from "@tanstack/react-query";
import { useSupabase } from "@/lib/db/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { IMAGE_BUCKET } from "@/lib/imageUrl";

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Uploads an image and returns its storage path.
 *
 * The path is deliberately <user-uuid>/<random>.<ext>: the storage policies
 * compare the first path segment against auth.uid(), so the folder IS the
 * ownership check. A flat namespace would let anyone overwrite anyone.
 *
 * No separate validation step. The bucket rejects the wrong MIME type or an
 * oversized file before the object exists, so there is no window in which bad
 * bytes are stored and then cleaned up.
 */
export function useImageUpload() {
  const supabase = useSupabase();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!user) throw new Error("You must be signed in to upload an image.");

      const extension = EXTENSION_BY_TYPE[file.type];
      if (!extension) {
        throw new Error("Please choose a JPG, PNG or WebP image.");
      }

      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;

      return path;
    },
  });
}

/** Removes an uploaded image. Storage policies scope this to the owner folder. */
export function useImageDelete() {
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async (path: string) => {
      if (!path || path.startsWith("http")) return;
      const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
      if (error) throw error;
    },
  });
}
