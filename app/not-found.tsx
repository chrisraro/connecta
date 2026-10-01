import Link from "next/link";
import { PublicNotice } from "@/components/marketing/PublicNotice";
import { PRIMARY_CTA, SECONDARY_CTA } from "@/components/marketing/siteLayout";
import survey from "@/components/survey/survey.module.css";

export default function NotFound() {
  return (
    <PublicNotice
      mark={
        // An unsurveyed lot: a dashed boundary with nothing recorded inside.
        <p
          className={`${survey.expanded} border-[1.5px] border-dashed px-8 py-4 text-7xl font-bold sm:text-8xl`}
          style={{ borderColor: "var(--sv-line)", color: "var(--sv-line)" }}
        >
          404
        </p>
      }
      title="We couldn't find that page"
      actions={
        <>
          <Link href="/" className={PRIMARY_CTA}>
            Back home
          </Link>
          <Link href="/shop" className={SECONDARY_CTA} style={{ borderColor: "var(--sv-line)" }}>
            Visit the shop
          </Link>
        </>
      }
    >
      The link may be broken, or the page may have moved.
    </PublicNotice>
  );
}
