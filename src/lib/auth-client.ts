"use client";

import { createAuthClient } from "better-auth/react";

// baseURL defaults to the current origin — correct in dev and behind Caddy.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
