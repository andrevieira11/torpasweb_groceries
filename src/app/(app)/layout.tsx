import { requireSession } from "@/lib/session";
import { TabBar } from "@/components/TabBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignOutButton } from "@/components/SignOutButton";
import { MotionProvider } from "@/components/MotionProvider";
import { ToastProvider } from "@/components/Toast";
import { LangProvider, LangToggle } from "@/components/LangProvider";
import { getLang } from "@/lib/i18n/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  const lang = await getLang();

  return (
    <LangProvider lang={lang}>
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-hairline bg-bg/85 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-lg">
        <span className="text-lg font-semibold tracking-tight">
          Mr<span className="text-brand">List</span>
        </span>
        <div className="flex items-center">
          <LangToggle />
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-3">
        <MotionProvider>
          <ToastProvider>{children}</ToastProvider>
        </MotionProvider>
      </main>

      <TabBar />
    </div>
    </LangProvider>
  );
}
