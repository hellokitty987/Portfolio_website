import React, { useState, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import RichTextEditor from './RichTextEditor';
import { Loader, X } from 'lucide-react';
import {
  PROJECT_CATEGORY_OPTIONS,
  canonicalizeProjectCategories,
  getProjectCategoryLabel,
  isCanonicalProjectCategory,
} from '../lib/projectCategories';

export interface ProjectFormData {
  title: string;
  shortDescription: string;
  category: string[];
  thumbnailFile?: File;
  thumbnailUrl?: string;
  fullTitle: string;
  description: string;
  visualizationType: 'tableau' | 'video' | 'image_gallery';
  tableauCode?: string;
  videoFile?: File;
  videoUrl?: string;
  imageFiles?: File[];
  imageUrls?: string[];
  sourceCodeGist?: string;
  sourceCodeText?: string;
  pdfFiles?: File[];
  pdfUrls?: string[];
  deletedPdfUrls?: string[];
  deletedImageUrls?: string[];
  deletedVideoUrl?: string;
  removeVideo?: boolean;
}

interface UnifiedProjectFormProps {
  onSubmit: (data: ProjectFormData) => void;
  initialData?: ProjectFormData;
  isLoading: boolean;
}

const UnifiedProjectForm: React.FC<UnifiedProjectFormProps> = ({
  isLoading,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    shortDescription: '',
    category: [],
    fullTitle: '',
    description: '',
    visualizationType: 'tableau',
    tableauCode: '',
    sourceCodeGist: '',
    sourceCodeText: '',
  });

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [existingPdfUrls, setExistingPdfUrls] = useState<string[]>([]);
  const [deleteVideo, setDeleteVideo] = useState(false);

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        shortDescription: initialData.shortDescription || '',
        category: canonicalizeProjectCategories(initialData.category),
        fullTitle: initialData.fullTitle || '',
        description: initialData.description || '',
        visualizationType: initialData.visualizationType || 'tableau',
        tableauCode: initialData.tableauCode || '',
        sourceCodeGist: initialData.sourceCodeGist || '',
        sourceCodeText: initialData.sourceCodeText || '',
      });

      if (initialData.imageUrls) {
        setExistingImageUrls(initialData.imageUrls);
      }
      if (initialData.pdfUrls) {
        setExistingPdfUrls(initialData.pdfUrls);
      }
    } else {
      // Reset form when no initial data (creating new project)
      setFormData({
        title: '',
        shortDescription: '',
        category: [],
        fullTitle: '',
        description: '',
        visualizationType: 'tableau',
        tableauCode: '',
        sourceCodeGist: '',
        sourceCodeText: '',
      });
      setThumbnailFile(null);
      setVideoFile(null);
      setImageFiles([]);
      setExistingImageUrls([]);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      category: canonicalizeProjectCategories(formData.category),
      thumbnailFile: thumbnailFile || undefined,
      videoFile: videoFile || undefined,
      imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
      imageUrls: existingImageUrls,
      pdfFiles: pdfFiles.length > 0 ? pdfFiles : undefined,
      pdfUrls: existingPdfUrls,
      deletedImageUrls:
        initialData?.imageUrls?.filter(url => !existingImageUrls.includes(url)) || [],
      deletedPdfUrls: initialData?.pdfUrls?.filter(url => !existingPdfUrls.includes(url)) || [],
      removeVideo: deleteVideo,
    });
  };

  const handleThumbnailChange = (files: File[]) => {
    setThumbnailFile(files[0] || null);
  };

  const handleVideoChange = (files: File[]) => {
    setVideoFile(files[0] || null);
    setDeleteVideo(false);
  };

  const handleImageGalleryChange = (files: File[]) => {
    setImageFiles(files);
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const categoryOptions = [
    ...PROJECT_CATEGORY_OPTIONS,
    ...formData.category
      .filter(category => !isCanonicalProjectCategory(category))
      .map(category => ({
        value: category,
        label: `${getProjectCategoryLabel(category)} (Legacy)`,
      })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Title*</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Short Description*</label>
          <textarea
            value={formData.shortDescription}
            onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
            required
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categories*</label>
          <select
            multiple
            value={formData.category}
            onChange={e => {
              const values = Array.from(e.target.selectedOptions, opt => opt.value);
              setFormData({ ...formData, category: values });
            }}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            {categoryOptions.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail Image*</label>
          <FileUpload
            accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
            maxFiles={1}
            onFileSelect={handleThumbnailChange}
            selectedFiles={thumbnailFile ? [thumbnailFile] : []}
            onRemoveFile={() => setThumbnailFile(null)}
            label="thumbnail image"
          />
          {initialData?.thumbnailUrl && !thumbnailFile && (
            <div className="mt-2">
              <p className="text-sm text-gray-500">Current thumbnail:</p>
              <img
                src={initialData.thumbnailUrl}
                alt="Current thumbnail"
                className="h-28 object-contain rounded-md"
              />
            </div>
          )}
        </div>
      </div>

      <div className="relative border-b-2 border-red-400 pt-10 pb-5">
        <h2 className="text-2xl font-bold">Project Details</h2>
      </div>

      {/* Project Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Title*</label>
          <input
            type="text"
            value={formData.fullTitle}
            onChange={e => setFormData({ ...formData, fullTitle: e.target.value })}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
          <RichTextEditor
            content={formData.description}
            onChange={content => setFormData({ ...formData, description: content })}
          />
        </div>
      </div>

      {/* Visualization */}
      <div className="space-y-4">
        {/* Tableau Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tableau Embed URL</label>
          <input
            value={formData.tableauCode}
            onChange={e => setFormData({ ...formData, tableauCode: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        {/* Video Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {initialData?.videoUrl ? 'Replace Video File' : 'Video File'}
          </label>
          <FileUpload
            accept={{ 'video/*': ['.mp4', '.webm'] }}
            maxFiles={1}
            onFileSelect={handleVideoChange}
            selectedFiles={videoFile ? [videoFile] : []}
            onRemoveFile={() => setVideoFile(null)}
            label="video file"
          />
          {initialData?.videoUrl && !videoFile && !deleteVideo && (
            <div className="mt-2 w-72 relative group">
              <p className="text-sm text-gray-500 mb-2">Current video:</p>
              <video src={initialData.videoUrl} controls className="max-w-full h-auto rounded" />
              <button
                type="button"
                onClick={() => setDeleteVideo(true)}
                className="absolute top-10 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete video"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {deleteVideo && (
            <p className="text-sm text-red-500">Video will be deleted upon saving.</p>
          )}
        </div>

        {/* Image Gallery Section */}
        {/* Image Gallery Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image Gallery</label>
          <FileUpload
            accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
            maxFiles={15}
            onFileSelect={files => {
              setImageFiles(prev => [...prev, ...files]);
            }}
            selectedFiles={imageFiles}
            onRemoveFile={index => {
              const newFiles = [...imageFiles];
              newFiles.splice(index, 1);
              setImageFiles(newFiles);
            }}
            label="gallery images"
          />
          {existingImageUrls.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Images</h4>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {existingImageUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PDF Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PDF Uploads</label>
          <FileUpload
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={15}
            onFileSelect={files => {
              setPdfFiles(prev => [...prev, ...files]);
            }}
            selectedFiles={pdfFiles}
            onRemoveFile={index => {
              const newFiles = [...pdfFiles];
              newFiles.splice(index, 1);
              setPdfFiles(newFiles);
            }}
            label="PDF files"
          />
          {existingPdfUrls.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Existing PDFs</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {existingPdfUrls.map((url, index) => (
                  <div key={index} className="relative group h-32">
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500"
                      >
                        PDF {index + 1}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExistingPdfUrls(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Source Code */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Github or website URL
          </label>
          <input
            type="url"
            value={formData.sourceCodeGist}
            onChange={e => setFormData({ ...formData, sourceCodeGist: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="https://example.com/"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Code Text</label>
          <textarea
            value={formData.sourceCodeText}
            onChange={e => setFormData({ ...formData, sourceCodeText: e.target.value })}
            rows={6}
            className="w-full font-mono text-sm border border-gray-300 rounded-md px-3 py-2"
            placeholder="Paste your code here..."
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center rounded-md border border-red-300 bg-red-200 px-6 py-3 font-semibold text-gray-900 transition-colors hover:bg-red-300 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
        >
          {isLoading ? (
            <>
              <Loader className="animate-spin mr-2" size={18} />
              Processing...
            </>
          ) : (
            'Save Project'
          )}
        </button>
      </div>
    </form>
  );
};

export default UnifiedProjectForm;
