import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import RichTextEditor from './RichTextEditor';

interface ProjectMetadata {
  fullTitle: string;
  description: string;
  visualizationType: 'tableau' | 'video' | 'image_gallery';
  tableauCode?: string;
  videoFile?: File;
  imageFiles?: File[];
  sourceCodeGist?: string;
  sourceCodeText?: string;
}

interface ProjectMetadataFormProps {
  projectId: string;
  onSubmit: (metadata: ProjectMetadata) => void;
  initialData?: Partial<ProjectMetadata>;
}

const ProjectMetadataForm: React.FC<ProjectMetadataFormProps> = ({
  projectId,
  onSubmit,
  initialData = {},
}) => {
  const [metadata, setMetadata] = useState<ProjectMetadata>({
    fullTitle: initialData.fullTitle || '',
    description: initialData.description || '',
    visualizationType: initialData.visualizationType || 'tableau',
    tableauCode: initialData.tableauCode,
    sourceCodeGist: initialData.sourceCodeGist,
    sourceCodeText: initialData.sourceCodeText,
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...metadata,
      videoFile: videoFile || undefined,
      imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Full Project Title</label>
        <input
          type="text"
          value={metadata.fullTitle}
          onChange={e => setMetadata({ ...metadata, fullTitle: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <RichTextEditor
          content={metadata.description}
          onChange={content => setMetadata({ ...metadata, description: content })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Visualization Type</label>
        <select
          value={metadata.visualizationType}
          onChange={e =>
            setMetadata({
              ...metadata,
              visualizationType: e.target.value as 'tableau' | 'video' | 'image_gallery',
            })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
        >
          <option value="tableau">Tableau Public</option>
          <option value="video">Video</option>
          <option value="image_gallery">Image Gallery</option>
        </select>
      </div>

      {metadata.visualizationType === 'tableau' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Tableau Embed URL</label>
          <textarea
            value={metadata.tableauCode}
            onChange={e => setMetadata({ ...metadata, tableauCode: e.target.value })}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
            required
          />
        </div>
      )}

      {metadata.visualizationType === 'video' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Video File</label>
          <FileUpload
            accept={{ 'video/mp4': ['.mp4'] }}
            maxFiles={1}
            onFileSelect={files => setVideoFile(files[0])}
            selectedFiles={videoFile ? [videoFile] : []}
            onRemoveFile={() => setVideoFile(null)}
            label="video file"
          />
        </div>
      )}

      {metadata.visualizationType === 'image_gallery' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Image Gallery</label>
          <FileUpload
            accept={{
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/png': ['.png'],
              'application/pdf': ['.pdf'],
            }}
            maxFiles={10}
            onFileSelect={files => setImageFiles([...imageFiles, ...files])}
            selectedFiles={imageFiles}
            onRemoveFile={index => {
              const newFiles = [...imageFiles];
              newFiles.splice(index, 1);
              setImageFiles(newFiles);
            }}
            label="images"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Source Code</label>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">GitHub Gist URL</label>
            <input
              type="url"
              value={metadata.sourceCodeGist}
              onChange={e => setMetadata({ ...metadata, sourceCodeGist: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
              placeholder="https://gist.github.com/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Plain Text Code</label>
            <textarea
              value={metadata.sourceCodeText}
              onChange={e => setMetadata({ ...metadata, sourceCodeText: e.target.value })}
              rows={6}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50 font-mono"
              placeholder="// Your code here..."
            />
          </div>
        </div>
      </div>

      <div>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-red-300 bg-red-200 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
        >
          Save Project Metadata
        </button>
      </div>
    </form>
  );
};

export default ProjectMetadataForm;
