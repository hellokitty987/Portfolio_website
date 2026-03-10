import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  accept: Record<string, string[]>;
  maxFiles?: number;
  onFileSelect: (files: File[]) => void;
  selectedFiles?: File[];
  onRemoveFile?: (index: number) => void;
  label: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  maxFiles = 1,
  onFileSelect,
  selectedFiles = [],
  onRemoveFile,
  label
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileSelect(acceptedFiles);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    multiple: maxFiles > 1
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-red-300'}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? (
            'Drop the files here...'
          ) : (
            <>
              Drag & drop {label} here, or click to select
              <br />
              <span className="text-xs text-gray-500">
                {Object.entries(accept)
                  .map(([key, values]) => values.join(', '))
                  .join(', ')}
              </span>
            </>
          )}
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <span className="text-sm text-gray-600 truncate flex-1">
                {file.name}
              </span>
              {onRemoveFile && (
                <button
                  type="button"
                  onClick={() => onRemoveFile(index)}
                  className="ml-2 text-gray-400 hover:text-red-400"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { FileUpload };