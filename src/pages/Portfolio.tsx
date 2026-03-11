import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import PublicPageHeading from '../components/PublicPageHeading';
import {
  PORTFOLIO_CATEGORY_FILTERS,
  type ProjectCategoryFilter,
} from '../lib/projectCategories';
import {
  compareProjectsByCategoryOrder,
  getProjectCategoryPriorityIndex,
  getProjectPrimaryCategory,
  normalizeProjectOrderingFields,
  sortProjectsForCategory,
  type ProjectCategorySortOrder,
} from '../lib/projectSortOrder';

interface Project {
  id: string;
  title: string;
  short_description: string;
  category: string[];
  category_sort_order: ProjectCategorySortOrder;
  thumbnail_url: string;
  slug: string;
  created_at: string;
}

export default function Portfolio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategoryFilter>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('visibility', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setProjects((data || []).map(project => normalizeProjectOrderingFields(project as Project)));
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    const matchingProjects = projects.filter(
      project => selectedCategory === 'all' || project.category.includes(selectedCategory),
    );

    if (selectedCategory !== 'all') {
      return sortProjectsForCategory(matchingProjects, selectedCategory);
    }

    return [...matchingProjects].sort((leftProject, rightProject) => {
      const leftPrimaryCategory = getProjectPrimaryCategory(leftProject.category);
      const rightPrimaryCategory = getProjectPrimaryCategory(rightProject.category);
      const priorityDifference =
        getProjectCategoryPriorityIndex(leftPrimaryCategory) -
        getProjectCategoryPriorityIndex(rightPrimaryCategory);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return compareProjectsByCategoryOrder(leftPrimaryCategory)(leftProject, rightProject);
    });
  }, [projects, selectedCategory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin h-8 w-8 text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{error}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-full mx-auto py-12 px-4 sm:px-6 lg:px-8"
      >
        <PublicPageHeading title="Portfolio" className="mb-8 text-gray-100" />

        <div className="mb-12 flex justify-center">
          <div className="max-w-full overflow-x-auto">
            <div className="inline-flex overflow-hidden rounded-none border border-gray-500/40 bg-gray-600/20">
              {PORTFOLIO_CATEGORY_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedCategory(value)}
                  className={`
        border-r border-gray-500/30 px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-200 last:border-r-0
        ${
          selectedCategory === value
            ? 'bg-[#FECACA] text-black'
            : 'bg-transparent text-gray-200 hover:bg-gray-500/25 hover:text-white'
        }
      `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
          {filteredProjects.map(project => (
            <Link
              key={project.id}
              to={`/project/${project.slug}`}
              className="group relative aspect-[4/3] overflow-hidden bg-gray-600/15"
            >
              <img
                src={project.thumbnail_url}
                alt={project.title}
                className="h-full w-full object-contain"
              />

              <div className="pointer-events-none absolute inset-0 z-10 bg-[#FECACA] opacity-0 transition-opacity duration-200 group-hover:opacity-65" />
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="max-w-full">
                  <h3 className="mb-1 line-clamp-2 text-[12px] font-semibold leading-snug text-black">
                    {project.title}
                  </h3>
                  <p className="line-clamp-2 text-[10px] leading-relaxed text-black">
                    {project.short_description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No projects found in this category.</p>
          </div>
        )}
      </motion.div>
      <Footer />
    </div>
  );
}
