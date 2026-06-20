import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Current session (or null) for the incoming request. Marks the route dynamic. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Session or bounce to sign-in. Use to gate authenticated routes. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}
