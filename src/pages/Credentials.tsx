import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import Footer from '../components/Footer';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface Credential {
  id: string;
  title: string;
  file_url: string;
  file_name: string;
  content_type: string;
  type: 'degree' | 'transcript';
  content: string;
}

export default function Credentials() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<Credential | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  console.log('selectedFile', selectedFile);

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('academic_credentials')
          .select('*')
          .eq('is_published', true);

        if (error) throw error;
        setCredentials(data || []);
        setSelectedFile(data || []);
      } catch (error) {
        console.error('Error fetching credentials:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
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
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-4xl font-bold my-8 text-red-200">Credentials</h1>

        {credentials.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No credentials available yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md mb-8">
            {selectedFile?.length > 0 && (
              <div className="p-8 pt-0 space-y-12">
                {selectedFile.map((file, i) => (
                  <div key={i}>
                    {file.content_type === 'application/pdf' ? (
                      <div className="flex flex-col items-center">
                        <div className="p-8">
                          <h2
                            className="text-xl font-bold mb-4"
                            dangerouslySetInnerHTML={{ __html: file.content }}
                          />
                        </div>
                        <Document
                          file={file.file_url}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          loading={
                            <div className="flex items-center justify-center py-12">
                              <Loader className="animate-spin h-8 w-8 text-gray-500" />
                            </div>
                          }
                          className="max-w-full"
                        >
                          {pdfError ? (
                            <div className="text-center py-12">
                              <p className="text-red-600 mb-4">{pdfError}</p>
                            </div>
                          ) : (
                            Array.from(new Array(numPages), (_, index) => (
                              <Page
                                key={`page_${index + 1}`}
                                pageNumber={index + 1}
                                width={Math.min(window.innerWidth - 64, 800)}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                className="mb-6"
                              />
                            ))
                          )}
                        </Document>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <img src={file.file_url} alt={file.title} className="max-w-full h-auto" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
      <Footer />
    </div>
  );
}
