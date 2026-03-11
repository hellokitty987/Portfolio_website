import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Loader, AlertCircle } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import GeometricBackground from '../components/GeometricBackground';
import Footer from '../components/Footer';
import PublicPageHeading from '../components/PublicPageHeading';

interface AboutSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface AboutContent {
  sections: AboutSection[];
}

export default function About() {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if Supabase is initialized
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }

        const { data, error: supabaseError } = await supabase
          .from('about_pages')
          .select('content')
          .eq('is_published', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (supabaseError) {
          throw supabaseError;
        }

        setContent(data?.content || null);
        setError(null);
      } catch (err) {
        console.error('Error fetching about content:', err);
        setError('Failed to load content. Please try again later.');

        // Implement retry logic
        if (retryCount < maxRetries) {
          setTimeout(
            () => {
              setRetryCount(prev => prev + 1);
            },
            Math.min(1000 * Math.pow(2, retryCount), 8000)
          ); // Exponential backoff
        }
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [retryCount]); // Retry when retryCount changes

  const handleRetry = () => {
    setRetryCount(0); // Reset retry count and trigger a new fetch
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader className="animate-spin h-8 w-8 text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <div className="text-center max-w-md mx-auto p-6 bg-gray-900 rounded-lg shadow-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-100 mb-2">Error Loading Content</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-200 text-black rounded-lg hover:bg-red-300 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">No content available yet.</p>
      </div>
    );
  }

  // Sort sections by order
  const sortedSections = [...content.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <GeometricBackground />
      <div className="relative z-10 flex flex-1 items-center pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-3xl mx-auto p-8 -translate-y-2"
        >
          <PublicPageHeading title="About Me" className="-translate-y-12 mb-8" />

          <div className="prose prose-lg max-w-none prose-invert">
            {sortedSections.map(section => {
              const sanitizedContent = DOMPurify.sanitize(section.content, {
                ADD_ATTR: ['target', 'rel'],
                ADD_TAGS: ['a'],
              });

              // Add mb-5 to empty <p> tags (including whitespace-only ones)
              const styledContent = sanitizedContent.replace(
                /<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/g,
                '<p class="mb-5"></p>'
              );

              return (
                <div key={section.id} className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 text-red-200">{section.title}</h2>
                  <div
                    className="text-gray-300 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                    dangerouslySetInnerHTML={{ __html: styledContent }}
                  />
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
