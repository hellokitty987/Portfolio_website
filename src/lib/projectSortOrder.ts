import {
  PROJECT_CATEGORY_PRIORITY,
  canonicalizeProjectCategories,
  canonicalizeProjectCategory,
} from './projectCategories';

export type ProjectCategorySortOrder = Record<string, number>;

type ProjectSortFields = {
  id: string;
  category: unknown;
  category_sort_order?: unknown;
  created_at?: string | null;
};

const DEFAULT_SORT_POSITION = Number.MAX_SAFE_INTEGER;

const getProjectTimestamp = (createdAt?: string | null) => {
  if (!createdAt) {
    return 0;
  }

  const timestamp = Date.parse(createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const normalizeProjectCategorySortOrder = (
  value: unknown,
  categories?: unknown,
): ProjectCategorySortOrder => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const allowedCategories = categories
    ? new Set(canonicalizeProjectCategories(categories))
    : null;

  return Object.entries(value).reduce<ProjectCategorySortOrder>((normalizedSortOrder, entry) => {
    const [rawCategory, rawPosition] = entry;
    const trimmedCategory = rawCategory.trim();
    const normalizedCategory = canonicalizeProjectCategory(trimmedCategory) ?? trimmedCategory;
    const numericPosition =
      typeof rawPosition === 'number'
        ? rawPosition
        : typeof rawPosition === 'string'
          ? Number(rawPosition)
          : Number.NaN;

    if (!normalizedCategory || !Number.isInteger(numericPosition) || numericPosition < 0) {
      return normalizedSortOrder;
    }

    if (allowedCategories && !allowedCategories.has(normalizedCategory)) {
      return normalizedSortOrder;
    }

    normalizedSortOrder[normalizedCategory] = numericPosition;
    return normalizedSortOrder;
  }, {});
};

export const normalizeProjectOrderingFields = <
  T extends {
    category: unknown;
    category_sort_order?: unknown;
  },
>(
  project: T,
): Omit<T, 'category' | 'category_sort_order'> & {
  category: string[];
  category_sort_order: ProjectCategorySortOrder;
} => {
  const normalizedCategories = canonicalizeProjectCategories(project.category);

  return {
    ...project,
    category: normalizedCategories,
    category_sort_order: normalizeProjectCategorySortOrder(
      project.category_sort_order,
      normalizedCategories,
    ),
  };
};

export const getProjectPrimaryCategory = (categories: unknown) => {
  const normalizedCategories = canonicalizeProjectCategories(categories);

  return (
    PROJECT_CATEGORY_PRIORITY.find(category => normalizedCategories.includes(category)) ??
    normalizedCategories[0] ??
    'uncategorized'
  );
};

export const getProjectCategoryPriorityIndex = (categoryKey: string) => {
  if (categoryKey === 'uncategorized') {
    return Number.POSITIVE_INFINITY;
  }

  const priorityIndex = PROJECT_CATEGORY_PRIORITY.indexOf(
    categoryKey as (typeof PROJECT_CATEGORY_PRIORITY)[number],
  );

  return priorityIndex === -1 ? Number.POSITIVE_INFINITY : priorityIndex;
};

export const getProjectSortPosition = (
  categorySortOrder: ProjectCategorySortOrder,
  categoryKey: string,
) => categorySortOrder[categoryKey] ?? DEFAULT_SORT_POSITION;

export const compareProjectsByCategoryOrder =
  <T extends ProjectSortFields>(categoryKey: string) =>
  (leftProject: T, rightProject: T) => {
    const leftSortOrder = normalizeProjectCategorySortOrder(
      leftProject.category_sort_order,
      leftProject.category,
    );
    const rightSortOrder = normalizeProjectCategorySortOrder(
      rightProject.category_sort_order,
      rightProject.category,
    );
    const leftPosition = getProjectSortPosition(leftSortOrder, categoryKey);
    const rightPosition = getProjectSortPosition(rightSortOrder, categoryKey);

    if (leftPosition !== rightPosition) {
      return leftPosition - rightPosition;
    }

    const createdAtDifference =
      getProjectTimestamp(rightProject.created_at) - getProjectTimestamp(leftProject.created_at);
    if (createdAtDifference !== 0) {
      return createdAtDifference;
    }

    return rightProject.id.localeCompare(leftProject.id);
  };

export const sortProjectsForCategory = <T extends ProjectSortFields>(
  projects: T[],
  categoryKey: string,
) => [...projects].sort(compareProjectsByCategoryOrder(categoryKey));
