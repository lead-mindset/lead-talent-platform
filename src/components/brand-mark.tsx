import { cn } from "cn";

/** Official LEAD mark (official brand SVG from the main site). */
export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/leadl2.svg" alt="LEAD" className={cn("w-auto", className)} />
  );
}
