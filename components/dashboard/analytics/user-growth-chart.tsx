export interface UserGrowthDatum {
  createdAt: Date;
  users: number;
}

export function UserGrowthChart({ data = [] }: { data?: UserGrowthDatum[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      User growth chart · {data.length} point{data.length > 1 ? "s" : ""}
    </div>
  );
}
