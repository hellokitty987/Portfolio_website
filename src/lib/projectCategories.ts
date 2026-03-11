export const PROJECT_CATEGORY_OPTIONS = [
  { value: 'data_science_ml', label: 'Data Science / ML' },
  { value: 'software_development', label: 'Software Development' },
  { value: 'data_engineering_system_design', label: 'Data Engineering / System Design' },
  { value: 'bim', label: 'BIM' },
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORY_OPTIONS)[number]['value'];
export type ProjectCategoryFilter = 'all' | ProjectCategory;

const CANONICAL_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  data_science_ml: 'Data Science / ML',
  software_development: 'Software Development',
  data_engineering_system_design: 'Data Engineering / System Design',
  bim: 'BIM',
};

const CATEGORY_BADGE_STYLES: Record<ProjectCategory, string> = {
  data_science_ml: 'border border-sky-200 bg-sky-50 text-sky-700',
  software_development: 'border border-violet-200 bg-violet-50 text-violet-700',
  data_engineering_system_design:
    'border border-amber-200 bg-amber-50 text-amber-700',
  bim: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
};

const CATEGORY_SECTION_STYLES: Record<
  ProjectCategory,
  {
    shell: string;
    accent: string;
    countBadge: string;
  }
> = {
  data_science_ml: {
    shell: 'border-sky-200/80 bg-sky-50/45',
    accent: 'bg-sky-500',
    countBadge: 'bg-sky-100 text-sky-700',
  },
  software_development: {
    shell: 'border-violet-200/80 bg-violet-50/45',
    accent: 'bg-violet-500',
    countBadge: 'bg-violet-100 text-violet-700',
  },
  data_engineering_system_design: {
    shell: 'border-amber-200/80 bg-amber-50/45',
    accent: 'bg-amber-500',
    countBadge: 'bg-amber-100 text-amber-700',
  },
  bim: {
    shell: 'border-emerald-200/80 bg-emerald-50/45',
    accent: 'bg-emerald-500',
    countBadge: 'bg-emerald-100 text-emerald-700',
  },
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

export const getProjectCategoryBadgeClassName = (category: string) => {
  const canonicalCategory = canonicalizeProjectCategory(category);

  if (canonicalCategory) {
    return CATEGORY_BADGE_STYLES[canonicalCategory];
  }

  return 'border border-gray-200 bg-gray-100 text-gray-700';
};

export const getProjectCategorySectionStyles = (category: string) => {
  const canonicalCategory = canonicalizeProjectCategory(category);

  if (canonicalCategory) {
    return CATEGORY_SECTION_STYLES[canonicalCategory];
  }

  return {
    shell: 'border-gray-200 bg-gray-50',
    accent: 'bg-gray-400',
    countBadge: 'bg-gray-100 text-gray-700',
  };
};
