"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { secondaryButtonClass } from "@/components/ui/form-field";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" className={secondaryButtonClass} onClick={handleLogout} disabled={isSubmitting}>
      {isSubmitting ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
