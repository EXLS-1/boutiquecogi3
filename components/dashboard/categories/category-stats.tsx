export function CategoryStats({ categories }: { categories: unknown[] }) {
	return <div className="rounded-xl border bg-card p-4">{categories.length} catégories</div>;
}
