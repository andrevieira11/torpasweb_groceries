import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { resolveInviteToken } from "@/lib/queries/sharing";
import { JoinInvite } from "@/components/JoinInvite";
import { LinkInvalid } from "@/components/LinkInvalid";
import { LangProvider } from "@/components/LangProvider";
import { getLang } from "@/lib/i18n/server";
import { listLabel, t } from "@/lib/i18n/strings";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/join/${token}`)}`);
  }

  const lang = await getLang();
  const resolved = await resolveInviteToken(token);
  if (!resolved) {
    return <LinkInvalid lang={lang} message={t(lang, "inviteInvalid")} />;
  }

  return (
    <LangProvider lang={lang}>
      <JoinInvite token={token} listName={listLabel(lang, resolved.list)} />
    </LangProvider>
  );
}
