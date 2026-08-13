import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ShoppingBag } from "lucide-react";
import { SigmaTapMark } from "@/components/brand/SigmaTapMark";
import { SIGMATAP } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center text-foreground">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/4 -z-10 aspect-square w-[120%] max-w-[640px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />

      <div className="mb-8 flex items-center gap-2 text-lg font-bold tracking-tight">
        <SigmaTapMark className="h-5 w-5 text-primary" />
        <span>{SIGMATAP.name}</span>
      </div>

      <p className="text-7xl font-black tracking-tighter sm:text-8xl">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The link may be broken, or the page may have moved. Let&apos;s get you
        back on track.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/">
          <Button className="h-12 rounded-2xl px-7 font-semibold">
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Back home
          </Button>
        </Link>
        <Link href="/shop">
          <Button variant="outline" className="h-12 rounded-2xl px-7 font-semibold">
            <ShoppingBag className="mr-2 h-4 w-4" aria-hidden="true" />
            Visit the shop
          </Button>
        </Link>
      </div>
    </div>
  );
}
