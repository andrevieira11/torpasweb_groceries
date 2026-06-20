"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Check,
  ChevronDown,
  Copy,
  LinkIcon,
  LogOut,
  Plus,
  Share2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { createList, deleteList, leaveList, setActiveList } from "@/lib/actions/lists";
import { createGuestLink, createInviteLink, revokeShareLink } from "@/lib/actions/sharing";

type ListLite = { id: string; name: string; isDefault: boolean; expiresAt: string | null };
type Active = ListLite & { role: "owner" | "member" };
type Tokens = { guest?: string; member_invite?: string };

const EXPIRY_OPTIONS = [
  { label: "No expiry", days: null },
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
];

export function ListMenu({
  active,
  lists,
  tokens,
}: {
  active: Active;
  lists: ListLite[];
  tokens: Tokens;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"home" | "new" | "share">("home");
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setView("home");
  }
  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 items-center gap-1.5"
      >
        <span className="truncate text-2xl font-semibold tracking-tight">{active.name}</span>
        <ChevronDown className="size-5 shrink-0 text-muted" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 z-50 bg-black/40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl border border-hairline bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-hairline" />

              {view === "home" && (
                <HomeView
                  active={active}
                  lists={lists}
                  pending={pending}
                  onSwitch={(id) => run(() => setActiveList({ listId: id }))}
                  onNew={() => setView("new")}
                  onShare={() => setView("share")}
                  onDelete={() => run(async () => {
                    await deleteList({ listId: active.id });
                    close();
                  })}
                  onLeave={() => run(async () => {
                    await leaveList({ listId: active.id });
                    close();
                  })}
                />
              )}

              {view === "new" && (
                <NewView
                  pending={pending}
                  onBack={() => setView("home")}
                  onCreate={(name, days) =>
                    run(async () => {
                      await createList({ name, expiresInDays: days });
                      close();
                    })
                  }
                />
              )}

              {view === "share" && (
                <ShareView active={active} initial={tokens} onBack={() => setView("home")} />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function HomeView({
  active,
  lists,
  pending,
  onSwitch,
  onNew,
  onShare,
  onDelete,
  onLeave,
}: {
  active: Active;
  lists: ListLite[];
  pending: boolean;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onShare: () => void;
  onDelete: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        Lists
      </p>
      <ul className="flex flex-col">
        {lists.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => onSwitch(l.id)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="flex-1 truncate text-[15px] font-medium">{l.name}</span>
              {l.expiresAt && <Expiry iso={l.expiresAt} />}
              {l.id === active.id && <Check className="size-4 text-brand" />}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onNew}
        className="mt-1 flex items-center gap-2 rounded-xl px-2 py-2.5 text-left text-brand transition-colors hover:bg-surface-2"
      >
        <Plus className="size-5" strokeWidth={2.4} />
        <span className="text-[15px] font-medium">New list</span>
      </button>

      <div className="my-2 border-t border-hairline" />

      {active.role === "owner" ? (
        <>
          <button
            type="button"
            onClick={onShare}
            className="flex items-center gap-2 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
          >
            <Share2 className="size-5 text-muted" />
            <span className="text-[15px] font-medium">Share &ldquo;{active.name}&rdquo;</span>
          </button>
          {!active.isDefault && (
            <button
              type="button"
              disabled={pending}
              onClick={onDelete}
              className="flex items-center gap-2 rounded-xl px-2 py-2.5 text-left text-over transition-colors hover:bg-over/10"
            >
              <Trash2 className="size-5" />
              <span className="text-[15px] font-medium">Delete list</span>
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={onLeave}
          className="flex items-center gap-2 rounded-xl px-2 py-2.5 text-left text-over transition-colors hover:bg-over/10"
        >
          <LogOut className="size-5" />
          <span className="text-[15px] font-medium">Leave list</span>
        </button>
      )}
    </div>
  );
}

function NewView({
  pending,
  onBack,
  onCreate,
}: {
  pending: boolean;
  onBack: () => void;
  onCreate: (name: string, days: number | null) => void;
}) {
  const [name, setName] = useState("");
  const [days, setDays] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-sm font-semibold">New list</p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="List name — e.g. Beach trip"
        aria-label="List name"
        className="h-12 rounded-2xl border border-hairline bg-bg px-4 text-base text-fg outline-none focus:border-brand"
      />
      <div className="flex flex-wrap gap-2">
        {EXPIRY_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setDays(opt.days)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              days === opt.days ? "border-brand bg-brand/10 text-fg" : "border-hairline text-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="h-11 flex-1 rounded-2xl border border-hairline text-sm font-semibold text-muted"
        >
          Back
        </button>
        <button
          type="button"
          disabled={pending || !name.trim()}
          onClick={() => onCreate(name.trim(), days)}
          className="h-11 flex-1 rounded-2xl bg-brand text-sm font-semibold text-white disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </div>
  );
}

function ShareView({
  active,
  initial,
  onBack,
}: {
  active: Active;
  initial: Tokens;
  onBack: () => void;
}) {
  const [invite, setInvite] = useState<string | undefined>(initial.member_invite);
  const [guest, setGuest] = useState<string | undefined>(initial.guest);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-sm font-semibold">Share &ldquo;{active.name}&rdquo;</p>

      <LinkRow
        icon={<UserPlus className="size-5 text-muted" />}
        title="Invite a member"
        hint="They sign in and can add + check items."
        path="join"
        token={invite}
        pending={pending}
        onCreate={() =>
          startTransition(async () => {
            const r = await createInviteLink({ listId: active.id });
            setInvite(r.token);
          })
        }
      />

      <LinkRow
        icon={<LinkIcon className="size-5 text-muted" />}
        title="Guest link (no account)"
        hint="Anyone with the link can view + add + check."
        path="g"
        token={guest}
        pending={pending}
        onCreate={() =>
          startTransition(async () => {
            const r = await createGuestLink({ listId: active.id });
            setGuest(r.token);
          })
        }
      />

      {(invite || guest) && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (invite) await revokeShareLink({ listId: active.id, kind: "member_invite" });
              if (guest) await revokeShareLink({ listId: active.id, kind: "guest" });
              setInvite(undefined);
              setGuest(undefined);
            })
          }
          className="px-1 text-left text-sm font-medium text-over"
        >
          Revoke all links
        </button>
      )}

      <button
        type="button"
        onClick={onBack}
        className="h-11 rounded-2xl border border-hairline text-sm font-semibold text-muted"
      >
        Back
      </button>
    </div>
  );
}

function LinkRow({
  icon,
  title,
  hint,
  path,
  token,
  pending,
  onCreate,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  path: "join" | "g";
  token: string | undefined;
  pending: boolean;
  onCreate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!token) return;
    const url = `${window.location.origin}/${path}/${token}`;
    void navigator.clipboard?.writeText(url);
    setCopied(true);
  }

  return (
    <div className="rounded-2xl border border-hairline bg-bg p-3">
      <div className="flex items-start gap-2">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">{title}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      </div>
      {token ? (
        <button
          type="button"
          onClick={copy}
          className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            copied ? "bg-good/15 text-good" : "bg-surface-2 text-fg hover:bg-hairline"
          }`}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied link" : "Copy link"}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={onCreate}
          className="mt-2 w-full rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Create link
        </button>
      )}
    </div>
  );
}

function Expiry({ iso }: { iso: string }) {
  return (
    <span className="text-xs text-muted">
      {formatDistanceToNowStrict(new Date(iso), { addSuffix: true })}
    </span>
  );
}
