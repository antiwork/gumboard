import { auth } from "@/auth";
import type { Session } from "next-auth";
import { DeepRequired } from "utility-types";

export type AuthenticatedSession = DeepRequired<Session>;
/**
 * Get authenticated session - only use in middleware-protected routes
 * where we know authentication has already been verified
 */
export async function getAuthenticatedSession(): Promise<AuthenticatedSession> {
  const session = await auth();

  // This should never happen in middleware-protected routes
  if (!session?.user?.id) {
    throw new Error("Authentication required - this should not happen in protected routes");
  }

  return session as AuthenticatedSession;
}
