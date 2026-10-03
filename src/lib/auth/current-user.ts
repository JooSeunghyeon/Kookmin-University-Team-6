import { cache } from "react";
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
 *
 * `(app)/layout.tsx`와 각 페이지가 모두 이 함수를 호출하므로, React `cache()`로 감싸
 * 같은 요청(렌더 1회) 안에서는 getUser·프로필 조회가 딱 한 번만 서울 Supabase로 왕복하도록 한다.
 * Next.js App Router는 요청마다 캐시를 새로 만들기 때문에 요청 간 데이터가 섞이지 않는다.
 */
export const requireCurrentUser = cache(async (): Promise<CurrentUser> => {
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
});
