import React from 'react';
import { Page } from 'react-pdf';

interface PdfPageStackProps {
  pageCount: number;
  pageKeyPrefix: string;
  width: number;
}

const PdfPageStack: React.FC<PdfPageStackProps> = ({ pageCount, pageKeyPrefix, width }) => {
  if (!pageCount) {
    return null;
  }

  return (
    <div className="w-full space-y-3 py-4">
      {Array.from({ length: pageCount }, (_, index) => (
        <div key={`${pageKeyPrefix}-${index + 1}`} className="flex justify-center">
          <div className="overflow-hidden rounded-[10px]">
            <Page
              pageNumber={index + 1}
              width={width}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="block"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default PdfPageStack;
