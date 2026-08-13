import { ProfileInfo, ProfileData } from "@/types/profile";
import { TemplateTheme } from "../theme";
import { SectionShell } from "./SectionShell";
import { galleryGridClass, galleryItemClass } from "./imagery";
import { ProfileImage } from "../ProfileImage";

type Gallery = NonNullable<ProfileInfo["gallery"]>;

export function GallerySection({
  gallery,
  theme,
  index,
  resolvedImages,
}: {
  gallery: Gallery;
  theme: TemplateTheme;
  index: number;
  resolvedImages?: ProfileData["resolvedImages"];
}) {
  return (
    <SectionShell theme={theme} index={index} heading="Gallery" bleed={theme.composition.imagery === "bleed"}>
      <div className={galleryGridClass(theme)}>
        {gallery.slice(0, 6).map((img, i) => (
          <div key={i} className={galleryItemClass(theme, i)} style={{ backgroundColor: theme.colors.surface }}>
            <ProfileImage
              src={img}
              alt={`Gallery ${i + 1}`}
              className="w-full h-full object-cover"
              resolvedImages={resolvedImages}
            />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
