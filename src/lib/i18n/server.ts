import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, asLang, type Lang } from "./strings";

export async function getLang(): Promise<Lang> {
  return asLang((await cookies()).get(LANG_COOKIE)?.value);
}
