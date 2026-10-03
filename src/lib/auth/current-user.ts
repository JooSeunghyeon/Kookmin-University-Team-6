import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/supabase/types";

export interface CurrentUser {
  authUserId: string;
  profile: AppUser;
}

/**
 * Server-only guard for pages under the authenticated app shell.
 * Redirects to /login when there is no session or the profile row is missing.
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single<AppUser>();

  if (!profile) {
    redirect("/login");
  }

  return { authUserId: user.id, profile };
}
