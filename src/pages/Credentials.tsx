import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Document, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import Footer from '../components/Footer';
import {
  formatCredentialSize,
  getCredentialDisplayName,
  getCredentialTypeLabel,
} from '../lib/credentialFiles';
import PdfPageStack from '../components/PdfPageStack';
import PublicPageHeading from '../components/PublicPageHeading';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface Credential {
  id: string;
  title: string;
  file_url: string;
  file_name?: string | null;
  content_type?: string | null;
  size?: number | null;
  type: 'degree' | 'transcript';
  content: string;
}

export default function Credentials() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfPageCounts, setPdfPageCounts] = useState<Record<string, number>>({});
  const [pdfErrors, setPdfErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('academic_credentials')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCredentials(data || []);
      } catch (error) {
        console.error('Error fetching credentials:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, []);

  function onDocumentLoadSuccess(credentialId: string, { numPages }: { numPages: number }) {
    setPdfPageCounts(current => ({ ...current, [credentialId]: numPages }));
    setPdfErrors(current => {
      const next = { ...current };
      delete next[credentialId];
      return next;
    });
  }

  function onDocumentLoadError(credentialId: string, error: Error) {
    console.error('Error loading PDF:', error);
    setPdfErrors(current => ({
      ...current,
      [credentialId]: 'Failed to load PDF. Please try downloading it instead.',
    }));
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
        <PublicPageHeading title="Credentials" className="my-8" />

        {credentials.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No credentials available yet.</p>
          </div>
        ) : (
          <div className="space-y-8 mb-8">
            {credentials.map(credential => (
              <section key={credential.id}>
                {credential.content_type === 'application/pdf' ? (
                  <div className="px-2 sm:px-0">
                    <div className="flex flex-col items-center">
                      <Document
                        file={credential.file_url}
                        onLoadSuccess={result => onDocumentLoadSuccess(credential.id, result)}
                        onLoadError={error => onDocumentLoadError(credential.id, error)}
                        loading={
                          <div className="flex items-center justify-center py-12">
                            <Loader className="h-8 w-8 animate-spin text-gray-500" />
                          </div>
                        }
                        className="max-w-full"
                      >
                        {pdfErrors[credential.id] ? (
                          <div className="text-center py-12">
                            <p className="mb-4 text-red-400">{pdfErrors[credential.id]}</p>
                          </div>
                        ) : (
                          <PdfPageStack
                            pageCount={pdfPageCounts[credential.id] || 0}
                            pageKeyPrefix={credential.id}
                            width={Math.min(window.innerWidth - 64, 800)}
                          />
                        )}
                      </Document>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg bg-white shadow-md">
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {getCredentialDisplayName(credential)}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                          {[getCredentialTypeLabel(credential), formatCredentialSize(credential.size)]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      </div>
                      <a
                        href={credential.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Open File
                      </a>
                    </div>

                    <div className="p-6">
                      <div className="flex justify-center">
                        <img
                          src={credential.file_url}
                          alt={getCredentialDisplayName(credential)}
                          className="max-w-full h-auto rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </motion.div>
      <Footer />
    </div>
  );
}
