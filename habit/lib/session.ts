import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/** Returns the signed-in user's id (Google sub), or null if unauthenticated. */
export async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}
