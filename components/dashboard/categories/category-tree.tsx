interface CategoryTreeProps {
	categories: unknown[];
	canCreate: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	canReorder: boolean;
	maxDepth: number;
}

export function CategoryTree({ categories }: CategoryTreeProps) {
	return <div className="rounded-xl border bg-card p-4">{categories.length} catégories</div>;
}
