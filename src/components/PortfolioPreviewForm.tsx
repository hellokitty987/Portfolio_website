import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import {
  PROJECT_CATEGORY_OPTIONS,
  canonicalizeProjectCategories,
} from '../lib/projectCategories';

interface PortfolioPreview {
  title: string;
  shortDescription: string;
  category: string[];
  thumbnailFile?: File;
}

interface PortfolioPreviewFormProps {
  onSubmit: (preview: PortfolioPreview) => void;
  initialData?: Partial<PortfolioPreview>;
}

const PortfolioPreviewForm: React.FC<PortfolioPreviewFormProps> = ({
  onSubmit,
  initialData = {},
}) => {
  const [preview, setPreview] = useState<PortfolioPreview>({
    title: initialData.title || '',
    shortDescription: initialData.shortDescription || '',
    category: canonicalizeProjectCategories(initialData.category),
  });

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...preview,
      category: canonicalizeProjectCategories(preview.category),
      thumbnailFile: thumbnailFile || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Project Title</label>
        <input
          type="text"
          value={preview.title}
          onChange={e => setPreview({ ...preview, title: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Short Description</label>
        <textarea
          value={preview.shortDescription}
          onChange={e => setPreview({ ...preview, shortDescription: e.target.value })}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Categories</label>
        <select
          multiple
          value={preview.category}
          onChange={e => {
            const values = Array.from(e.target.selectedOptions, option => option.value);
            setPreview({ ...preview, category: values });
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
          required
        >
          {PROJECT_CATEGORY_OPTIONS.map(category => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Thumbnail Image</label>
        <FileUpload
          accept={{
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
          }}
          maxFiles={1}
          onFileSelect={files => setThumbnailFile(files[0])}
          selectedFiles={thumbnailFile ? [thumbnailFile] : []}
          onRemoveFile={() => setThumbnailFile(null)}
          label="thumbnail image"
        />
      </div>

      <div>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-200 hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Save Portfolio Preview
        </button>
      </div>
    </form>
  );
};

export default PortfolioPreviewForm;
