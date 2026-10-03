import { requireCurrentUser } from "@/lib/auth/current-user";
import { BottomTabBar, SidebarNav } from "@/components/nav/bottom-tab-bar";
import { MobileTopBar } from "@/components/nav/mobile-top-bar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireCurrentUser();
  const canWrite = profile.status === "active";

  return (
    <div className="min-h-screen md:pl-56">
      <SidebarNav canWrite={canWrite} userId={profile.id} />
      <MobileTopBar userId={profile.id} />
      <div className="mx-auto w-full max-w-xl pb-24 md:pb-10">{children}</div>
      <BottomTabBar canWrite={canWrite} />
    </div>
  );
}
