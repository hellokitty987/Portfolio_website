import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import { Document, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import Footer from '../components/Footer';
import PdfPageStack from '../components/PdfPageStack';
import PublicPageHeading from '../components/PublicPageHeading';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface Resume {
  content: string | null;
  pdf_url: string | null;
}

interface ResumeFile {
  file_url: string;
  file_name: string;
}

export default function Resume() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [resumeFile, setResumeFile] = useState<ResumeFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        setLoading(true);
        setPdfError(null);

        const { data: resumeData, error: resumeError } = await supabase
          .from('resumes')
          .select('content')
          .eq('is_published', true)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (resumeError) throw resumeError;

        const { data: fileData, error: fileError } = await supabase
          .from('resume_files')
          .select('file_url, file_name')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fileError) throw fileError;

        setResume(resumeData?.[0] || { content: null, pdf_url: null });
        setResumeFile(fileData?.[0] || null);
      } catch (error) {
        console.error('Error fetching resume:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPdfError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    setPdfError('Failed to load PDF. Please try downloading it instead.');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin h-8 w-8 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-4xl"
      >
        <PublicPageHeading title="Resume" className="mb-8 mt-8" />

        {resume?.content ? (
          <div className="mb-8 rounded-lg bg-white p-8 shadow-md">
            <div className="prose max-w-none text-gray-900">
              <ReactMarkdown>{resume.content}</ReactMarkdown>
            </div>
          </div>
        ) : resumeFile ? (
          <div className="mb-8 px-2 sm:px-0">
            <div className="flex flex-col items-center">
              <Document
                file={resumeFile.file_url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                }
                className="max-w-full"
              >
                {pdfError ? (
                  <div className="text-center py-12">
                    <p className="mb-4 text-red-400">{pdfError}</p>
                  </div>
                ) : (
                  <PdfPageStack
                    pageCount={numPages || 0}
                    pageKeyPrefix="resume-page"
                    width={Math.min(window.innerWidth - 64, 800)}
                  />
                )}
              </Document>
            </div>
          </div>
        ) : (
          <div className="mb-8 text-center py-12">
            <p className="text-gray-400">No resume content available yet.</p>
          </div>
        )}
      </motion.div>
      <Footer />
    </div>
  );
}
