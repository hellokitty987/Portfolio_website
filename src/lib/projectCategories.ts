export const PROJECT_CATEGORY_OPTIONS = [
  { value: 'data_science_ml', label: 'Data Science / ML' },
  { value: 'software_development', label: 'Software Development' },
  { value: 'data_engineering_system_design', label: 'Data Engineering System Design' },
  { value: 'bim', label: 'BIM' },
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORY_OPTIONS)[number]['value'];
export type ProjectCategoryFilter = 'all' | ProjectCategory;

const CANONICAL_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  data_science_ml: 'Data Science / ML',
  software_development: 'Software Development',
  data_engineering_system_design: 'Data Engineering System Design',
  bim: 'BIM',
};

const LEGACY_CATEGORY_MAP: Record<string, ProjectCategory> = {
  data_science: 'data_science_ml',
  machine_learning: 'data_science_ml',
  solution_diagrams: 'data_engineering_system_design',
  data_science_ml: 'data_science_ml',
  software_development: 'software_development',
  data_engineering_system_design: 'data_engineering_system_design',
  bim: 'bim',
};

export const PORTFOLIO_CATEGORY_FILTERS: Array<{ value: ProjectCategoryFilter; label: string }> = [
  { value: 'all', label: 'Show All' },
  ...PROJECT_CATEGORY_OPTIONS,
];

export const PROJECT_CATEGORY_PRIORITY: ProjectCategory[] = PROJECT_CATEGORY_OPTIONS.map(
  option => option.value,
);

export const isCanonicalProjectCategory = (category: string): category is ProjectCategory =>
  category in CANONICAL_CATEGORY_LABELS;

export const canonicalizeProjectCategory = (category: string): ProjectCategory | null =>
  LEGACY_CATEGORY_MAP[category.trim()] ?? null;

export const canonicalizeProjectCategories = (categories: unknown): string[] => {
  if (typeof categories === 'string') {
    const normalizedCategory = canonicalizeProjectCategory(categories) ?? categories.trim();
    return normalizedCategory ? [normalizedCategory] : [];
  }

  if (!Array.isArray(categories)) {
    return [];
  }

  const seen = new Set<string>();
  const normalizedCategories: string[] = [];

  for (const category of categories) {
    if (typeof category !== 'string') {
      continue;
    }

    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      continue;
    }

    const normalizedCategory = canonicalizeProjectCategory(trimmedCategory) ?? trimmedCategory;
    if (!seen.has(normalizedCategory)) {
      seen.add(normalizedCategory);
      normalizedCategories.push(normalizedCategory);
    }
  }

  return normalizedCategories;
};

export const getProjectCategoryLabel = (category: string) => {
  const canonicalCategory = canonicalizeProjectCategory(category);

  if (canonicalCategory) {
    return CANONICAL_CATEGORY_LABELS[canonicalCategory];
  }

  return category
    .split('_')
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};
