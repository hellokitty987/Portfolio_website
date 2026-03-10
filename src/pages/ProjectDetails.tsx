import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DOMPurify from 'isomorphic-dompurify';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import TableauEmbed from '../components/TableauEmbed';
import Footer from '../components/Footer';
import { canonicalizeProjectCategories, getProjectCategoryLabel } from '../lib/projectCategories';
import PublicPageHeading from '../components/PublicPageHeading';

interface Project {
  id: string;
  title: string;
  description: string;
  detailed_content: string;
  embed_type: 'tableau' | 'video' | 'image';
  thumbnail_url: string;
  full_title: string;
  short_description: string;
  source_code_gist_url: string;
  visualization_type: 'tableau' | 'video' | 'image_gallery';
  tableau_embed_code: string;
  video_url: string;
  image_gallery_urls: string[];
  pdfs: string[];
  source_code: string;
  category: string[];
  source_code_plaintext: string;
}

export default function ProjectDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const detectLanguage = (code: string): string => {
    if (code.includes('import ') || code.includes('def ') || code.includes('print(')) {
      return 'python';
    } else if (code.includes('function ') || code.includes('const ') || code.includes('let ')) {
      return 'javascript';
    }
    return 'text';
  };

  useEffect(() => {
    fetchProject();
  }, [slug]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .eq('visibility', true)
        .single();

      if (error) throw error;
      setProject({
        ...data,
        category: canonicalizeProjectCategories(data.category),
      });
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Project not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin h-8 w-8 text-gray-500" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{error || 'Project not found'}</h2>
          <button
            onClick={() => navigate('/portfolio')}
            className="inline-flex items-center text-red-200 hover:text-red-300"
          >
            <ArrowLeft className="mr-2" size={20} />
            Back to Portfolio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-full mx-auto py-12"
      >
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/portfolio')}
            className="inline-flex items-center text-red-200 hover:text-red-300 mb-8"
          >
            <ArrowLeft className="mr-2" size={20} />
            Back to Portfolio
          </button>

          <div className="mb-8 text-center">
            <PublicPageHeading title={project.title} className="mb-4" />
            {project.category.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {project.category.map(category => (
                  <span
                    key={category}
                    className="rounded-full bg-gray-100 px-4 py-1 text-sm text-gray-700"
                  >
                    {getProjectCategoryLabel(category)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Content */}
          {project.description && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6 text-red-200">Description</h2>
              <div
                className="text-white space-y-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2 [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(project.description),
                }}
              />
            </div>
          )}
        </div>

        {/* Visualization Section */}

        {project.tableau_embed_code && (
          <div className="w-full">
            <h2 className="text-2xl font-bold mb-6 text-red-200 max-w-4xl mx-auto">
              Visualization
            </h2>{' '}
            <div className="max-w-[1440px] w-full block mx-auto">
              <TableauEmbed url={project.tableau_embed_code} />
            </div>
          </div>
        )}
        {(project.video_url || project.image_gallery_urls || project.pdfs) && (
          <div className="mb-12 max-w-4xl mx-auto">
            {project.video_url && (
              <div className="aspect-video w-full bg-black rounded-lg shadow-lg overflow-hidden mt-6">
                <h3 className="text-lg font-bold mb-4 text-red-200">Video</h3>
                <video className="w-full h-full" controls autoPlay muted playsInline>
                  <source src={project.video_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {project?.image_gallery_urls?.length > 0 && (
              <div className="relative mt-6">
                <h3 className="text-lg font-bold mb-4 text-red-200">Image Gallery</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                  {project?.image_gallery_urls?.map((url, index) => {
                    return (
                      <div
                        key={index}
                        className="rounded-lg shadow-lg overflow-hidden bg-white relative"
                      >
                        <img
                          src={url}
                          alt={`${project.title} image ${index + 1}`}
                          className="w-full h-full object-contain aspect-[6/4] cursor-pointer"  // className="w-full h-full object-fit aspect-[6/4] cursor-pointer"
                          onClick={() => {
                            setLightboxIndex(index);
                            setIsLightboxOpen(true);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {isLightboxOpen && (
                  <div className="bg-black bg-opacity-90 fixed w-screen h-screen top-0 left-0 z-50">
                    <button
                      className="fixed z-[100] top-5 right-5 text-white text-4xl"
                      onClick={() => setIsLightboxOpen(false)}
                    >
                      &times;
                    </button>
                    <div className="inset-0 flex justify-center items-center w-[90vw] h-[80vh] fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="relative">
                        <img
                          src={project.image_gallery_urls[lightboxIndex]}
                          alt={`Lightbox image ${lightboxIndex + 1}`}
                          className="max-w-[90vw] max-h-[90vh] object-contain aspect-square"
                        />
                        <button
                          onClick={() =>
                            setLightboxIndex(prev =>
                              prev === 0 ? project.image_gallery_urls.length - 1 : prev - 1
                            )
                          }
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-lg bg-black bg-opacity-40 rounded-full w-8 h-8 flex items-center justify-center"
                        >
                          &#10094;
                        </button>
                        <button
                          onClick={() =>
                            setLightboxIndex(prev =>
                              prev === project.image_gallery_urls.length - 1 ? 0 : prev + 1
                            )
                          }
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-lg bg-black bg-opacity-40 rounded-full w-8 h-8 flex items-center justify-center"
                        >
                          &#10095;
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {project.pdfs && (
              <div className="relative mt-6 max-w-4xl mx-auto">
                <h3 className="text-lg font-bold mb-4 text-red-200">PDF files</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-5">
                  {project?.pdfs?.map((url, index) => {
                    return (
                      <div
                        key={index}
                        className="rounded-lg shadow-lg overflow-hidden bg-white relative"
                      >
                        <div
                          onClick={() => window.open(url, '_blank')}
                          className="w-full h-full aspect-square flex flex-col items-center justify-center bg-gray-100 text-gray-800 font-semibold text-center cursor-pointer hover:bg-gray-200 transition"
                        >
                          <span className="text-4xl mb-2">📄</span>
                          <span className="text-sm px-2">Open PDF</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Source Code Section */}
        {(project.source_code_plaintext || project.source_code_gist_url) && (
          <div className="mb-12 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-red-200">Source Code:</h2>
              {project.source_code_gist_url && (
                <a
                  href={project.source_code_gist_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex mt-2 items-center gap-2 text-red-200 hover:text-red-300"
                >
                  <ExternalLink size={16} />
                  <span>View Source Code or Website</span>
                </a>
              )}
            </div>

            {project.source_code_plaintext && (
              <div className="rounded-lg overflow-hidden shadow-lg">
                <SyntaxHighlighter
                  language={detectLanguage(project.source_code_plaintext)}
                  style={atomDark}
                  showLineNumbers={true}
                  wrapLines={true}
                  customStyle={{
                    margin: 0,
                    padding: '1.5rem',
                    fontSize: '0.9rem',
                    borderRadius: '0.5rem',
                  }}
                >
                  {project.source_code_plaintext}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        )}
      </motion.div>
      <Footer />
    </div>
  );
}
