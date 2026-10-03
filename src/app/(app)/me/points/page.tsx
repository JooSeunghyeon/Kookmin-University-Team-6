import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { POINT_TRANSACTION_LABEL } from "@/lib/constants";
import { formatKoreanDateTime } from "@/lib/time";
import { cn, formatPoints } from "@/lib/utils";
import type { PointTransaction } from "@/lib/supabase/types";

export default async function PointsPage() {
  const { profile } = await requireCurrentUser();
  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from("point_transactions")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<PointTransaction[]>();

  return (
    <main className="flex flex-col gap-4 px-5 pt-6">
      <h1 className="text-xl font-bold text-gray-900">포인트 내역</h1>

      <div className="rounded-2xl bg-[#3B5BFD]/5 p-5 text-center">
        <p className="text-sm text-gray-500">현재 보유 포인트</p>
        <p className="mt-1 text-3xl font-bold text-[#3B5BFD]">{formatPoints(profile.point_balance)}</p>
      </div>

      <div className="flex flex-col divide-y divide-gray-100 rounded-2xl border border-gray-100">
        {!transactions || transactions.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">아직 내역이 없어요.</p>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {POINT_TRANSACTION_LABEL[transaction.type] ?? transaction.type}
                </p>
                <p className="text-xs text-gray-400">{formatKoreanDateTime(transaction.created_at)}</p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "text-sm font-bold",
                    transaction.amount >= 0 ? "text-[#3B5BFD]" : "text-[#F04452]",
                  )}
                >
                  {transaction.amount >= 0 ? "+" : ""}
                  {formatPoints(transaction.amount)}
                </p>
                {transaction.balance_after !== null && (
                  <p className="text-xs text-gray-400">잔액 {formatPoints(transaction.balance_after)}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
