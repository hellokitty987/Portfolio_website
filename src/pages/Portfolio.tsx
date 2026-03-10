import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

interface Project {
  id: string;
  title: string;
  short_description: string;
  category: string[];
  thumbnail_url: string;
  slug: string;
}

type Category =
  | 'all'
  | 'data_science'
  | 'machine_learning'
  | 'software_development'
  | 'solution_diagrams'
  | 'bim';

const categories: { value: Category; label: string }[] = [
  { value: 'all', label: 'Show All' },
  { value: 'data_science', label: 'Data Science' },
  { value: 'machine_learning', label: 'Machine Learning' },
  { value: 'software_development', label: 'Software Development' },
  { value: 'solution_diagrams', label: 'Solution Diagrams' },
  { value: 'bim', label: 'BIM' },
];

export default function Portfolio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
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

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const categoryPriority: Category[] = [
    'data_science',
    'machine_learning',
    'software_development',
    'solution_diagrams',
    'bim',
  ];

  const filteredProjects = projects
    .filter(project => selectedCategory === 'all' || project.category.includes(selectedCategory))
    .sort((a, b) => {
      if (selectedCategory !== 'all') return 0;

      const getPriority = (project: Project) => {
        // Pick the first category that matches the priority list
        return categoryPriority.findIndex(cat => project.category.includes(cat));
      };

      return getPriority(a) - getPriority(b);
    });

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
        <h1 className="text-4xl font-bold mb-8 text-center text-red-200">Portfolio</h1>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-12">
          {categories.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelectedCategory(value)}
              className={`
        px-6 py-2 rounded-lg transition-colors
        ${
          selectedCategory === value
            ? 'bg-red-400 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
      `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
          {filteredProjects.map(project => (
            <Link
              key={project.id}
              to={`/project/${project.slug}`}
              className="group relative aspect-[4/3] overflow-hidden bg-gray-100"
            >
              {/* Thumbnail */}
              <img
                src={project.thumbnail_url}
                alt={project.title}
                className="w-full h-full object-contain"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-red-400 bg-opacity-80 flex flex-col justify-center p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <h3 className="text-xl font-semibold text-white mb-2">{project.title}</h3>
                <p className="text-white text-sm line-clamp-3">{project.short_description}</p>
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
