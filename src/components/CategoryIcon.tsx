import {
  Apple,
  BookOpen,
  Croissant,
  Fish,
  Milk,
  ShoppingBasket,
  Snowflake,
  SprayCan,
  Wheat,
  Wine,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Apple,
  Milk,
  Fish,
  Croissant,
  Snowflake,
  Wheat,
  Wine,
  SprayCan,
  ShoppingBasket,
  BookOpen,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? ShoppingBasket;
  return <Icon className={className} aria-hidden />;
}
