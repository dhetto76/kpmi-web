import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Stand-in for `next/image`.
 *
 * Next.js resized and re-encoded images through its own optimizer endpoint.
 * React Router has no such thing, so this renders a plain `<img>` and the
 * browser downloads the file as authored. Two consequences worth knowing:
 *
 *  - Large uploads are served at full size. Supabase Storage can transform on
 *    the fly (`?width=…`), which is the natural replacement when it matters.
 *  - `sizes` is kept in the signature but only does something once a real
 *    `srcSet` exists, so it is accepted and ignored rather than dropped —
 *    keeping call sites unchanged for whenever srcSet arrives.
 *
 * `fill` reproduces the layout behaviour call sites depend on: absolutely
 * filling the nearest positioned ancestor. Those ancestors already carry
 * `relative` from the Next.js version, so the markup did not change.
 */
export function Image({
  fill = false,
  priority = false,
  sizes: _sizes,
  className,
  alt,
  ...props
}: Omit<ComponentProps<"img">, "sizes"> & {
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <img
      // The hero is the largest paint on the page; everything else can wait.
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      // `alt` is required by the underlying element; call sites pass "" for
      // decorative images, which is the correct value, not a missing one.
      alt={alt ?? ""}
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      {...props}
    />
  );
}
