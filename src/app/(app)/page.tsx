import { ShoppingBasket } from "lucide-react";

export default function ListPage() {
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Your list</h1>

      <div className="flex flex-col items-center gap-3 rounded-3xl border border-hairline bg-surface px-6 py-14 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
          <ShoppingBasket className="size-7" />
        </div>
        <p className="text-base font-medium">Nothing here yet</p>
        <p className="max-w-[18rem] text-sm text-muted">
          Soon you&apos;ll just type or speak — &ldquo;milk, 2kg potatoes,
          bananas&rdquo; — and it sorts itself into the right aisles.
        </p>
      </div>
    </section>
  );
}
