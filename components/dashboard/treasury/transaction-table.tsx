export function TransactionTable({ transactions = [] }: { transactions?: unknown[]; canRefund?: boolean }) {
  return <div className="rounded-xl border bg-card p-4">Transaction table ({transactions.length})</div>;
}
