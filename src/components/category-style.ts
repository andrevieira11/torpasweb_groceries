import type { CategoryColor } from "@/lib/categories";

// Literal class strings (not interpolated) so Tailwind keeps them in the build.
export const CATEGORY_TEXT: Record<CategoryColor, string> = {
  green: "text-cat-green",
  blue: "text-cat-blue",
  red: "text-cat-red",
  amber: "text-cat-amber",
  slate: "text-cat-slate",
};

export const CATEGORY_SOFT: Record<CategoryColor, string> = {
  green: "bg-cat-green/12",
  blue: "bg-cat-blue/12",
  red: "bg-cat-red/12",
  amber: "bg-cat-amber/12",
  slate: "bg-cat-slate/12",
};
