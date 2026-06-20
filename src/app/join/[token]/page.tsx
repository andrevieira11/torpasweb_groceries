import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { resolveInviteToken } from "@/lib/queries/sharing";
import { JoinInvite } from "@/components/JoinInvite";
import { LinkInvalid } from "@/components/LinkInvalid";

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

  const resolved = await resolveInviteToken(token);
  if (!resolved) {
    return <LinkInvalid message="This invite is invalid or has expired." />;
  }

  return <JoinInvite token={token} listName={resolved.list.name} />;
}
