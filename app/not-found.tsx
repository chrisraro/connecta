import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ShoppingBag } from "lucide-react";
import { ConnectaMark } from "@/components/brand/ConnectaMark";
import { CONNECTA } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="sheet-grid relative flex min-h-screen flex-col items-center justify-center px-6 text-center text-foreground">

      <Link href="/" className="mb-10 flex items-center gap-2.5">
        <ConnectaMark className="h-7 w-7 text-primary" />
        <span className="text-[15px] font-bold tracking-[0.1em] [font-stretch:125%]">
          {CONNECTA.name.toUpperCase()}
        </span>
      </Link>

      {/* An unsurveyed lot: a dashed boundary with nothing recorded inside. */}
      <p className="border-[1.5px] border-dashed border-input px-8 py-4 text-7xl font-bold text-primary [font-stretch:125%] sm:text-8xl">
        404
      </p>
      <h1 className="mt-8 text-2xl font-bold [font-stretch:112%] sm:text-3xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The link may be broken, or the page may have moved. Let&apos;s get you back on track.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/">
          <Button className="h-12 px-7">
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Back home
          </Button>
        </Link>
        <Link href="/shop">
          <Button variant="outline" className="h-12 px-7">
            <ShoppingBag className="mr-2 h-4 w-4" aria-hidden="true" />
            Visit the shop
          </Button>
        </Link>
      </div>
    </div>
  );
}
