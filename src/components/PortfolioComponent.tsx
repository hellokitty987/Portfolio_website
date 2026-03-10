import React, { useState } from 'react';
import UnifiedProjectForm from './UnifiedProjectForm';
import { Eye, EyeOff, Trash2, Edit, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import slugify from 'slugify';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  canonicalizeProjectCategories,
  getProjectCategoryLabel,
} from '../lib/projectCategories';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string[];
  visibility: boolean;
  thumbnail_url: string;
  full_title: string;
  short_description: string;
  source_code_gist_url: string;
  visualization_type: 'tableau' | 'video' | 'image_gallery';
  tableau_embed_code: string;
  video_url: string;
  image_gallery_urls: string[];
  sourceCodeText?: string;
  pdfs?: string[];
}

const PortfolioComponent = ({
  fetchProjects,
  projects,
  setProjects,
}: {
  fetchProjects: () => void;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const resetForm = () => {
    setEditingProject(null);
    setIsEditing(false);
    setFormKey(prev => prev + 1);
  };

  const handleCreateProject = async (data: any) => {
    setIsLoading(true);
    try {
      let thumbnailUrl = '';
      let videoUrl = '';
      let imageUrls: string[] = [];
      let pdfUrls: string[] = [];

      // Upload thumbnail
      if (data.thumbnailFile) {
        const ext = data.thumbnailFile.name.split('.').pop();
        const name = `${crypto.randomUUID()}.${ext}`;
        const path = `${name}`;

        const { error } = await supabase.storage
          .from('project-files')
          .upload(path, data.thumbnailFile);
        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-files').getPublicUrl(path);
        thumbnailUrl = publicUrl;
      }

      if (data.pdfFiles?.length) {
        for (const file of data.pdfFiles) {
          const ext = file.name.split('.').pop();
          const name = `${crypto.randomUUID()}.${ext}`;
          const path = `pdf-files/${name}`; // Upload to pdf-files folder

          const { error } = await supabase.storage.from('project-files').upload(path, file);
          if (error) throw error;

          const {
            data: { publicUrl },
          } = supabase.storage.from('project-files').getPublicUrl(path);
          pdfUrls.push(publicUrl);
        }
      }

      // Upload video
      if (data.videoFile) {
        const ext = data.videoFile.name.split('.').pop();
        const name = `${crypto.randomUUID()}.${ext}`;
        const path = `${name}`;

        const { error } = await supabase.storage.from('project-files').upload(path, data.videoFile);
        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-files').getPublicUrl(path);
        videoUrl = publicUrl;
      }

      // Upload image gallery
      if (data.imageFiles?.length) {
        for (const file of data.imageFiles) {
          const ext = file.name.split('.').pop();
          const name = `${crypto.randomUUID()}.${ext}`;
          const path = `project-files/${name}`;

          const { error } = await supabase.storage.from('project-files').upload(path, file);
          if (error) throw error;

          const {
            data: { publicUrl },
          } = supabase.storage.from('project-files').getPublicUrl(path);
          imageUrls.push(publicUrl);
        }
      }

      // Insert into projects table
      const normalizedCategories = canonicalizeProjectCategories(data.category);

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          title: data.title,
          slug: slugify(data.title, { lower: true }),
          short_description: data.shortDescription,
          category: normalizedCategories,
          thumbnail_url: thumbnailUrl,
          full_title: data.fullTitle,
          description: data.description,
          visualization_type: data.visualizationType,
          tableau_embed_code: data.tableauCode,
          video_url: videoUrl || null,
          image_gallery_urls: imageUrls.length ? imageUrls : null,
          source_code_gist_url: data.sourceCodeGist,
          source_code_plaintext: data.sourceCodeText,
          visibility: true,
          pdfs: pdfUrls.length ? pdfUrls : null,
        })
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => [
        {
          ...project,
          category: canonicalizeProjectCategories(project.category),
        },
        ...prev,
      ]);
      toast.success('Project created successfully!');
      resetForm();
      fetchProjects();
    } catch (err) {
      toast.error('Failed to create project');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const editProject = (project: Project) => {
    setEditingProject(project);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    resetForm();
    toast('Edit cancelled', { icon: 'ℹ️' });
  };

  const deleteProject = async (projectId: string) => {
    try {
      setIsLoading(true);

      // First delete associated files
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const filesToDelete: string[] = [];

        if (project.thumbnail_url) {
          filesToDelete.push(project.thumbnail_url.split('/').pop()!);
        }

        if (project.video_url) {
          filesToDelete.push(project.video_url.split('/').pop()!);
        }

        if (project.image_gallery_urls?.length) {
          project.image_gallery_urls.forEach(url => {
            filesToDelete.push(url.split('/').pop()!);
          });
        }

        if (filesToDelete.length) {
          await supabase.storage.from('project-files').remove(filesToDelete);
        }
        if (project.pdfs?.length) {
          const pdfFilesToDelete = project.pdfs.map(url => url.split('/').pop()!);
          await supabase.storage.from('project-files').remove(pdfFilesToDelete);
        }
      }

      // Then delete the project record
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;

      setProjects(projects.filter(project => project.id !== projectId));
      toast.success('Project deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete project');
      console.error(err);
    } finally {
      setIsLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const handleUpdateProject = async (data: any) => {
    if (!editingProject) return;

    setIsLoading(true);
    try {
      let thumbnailUrl = editingProject.thumbnail_url;
      let videoUrl = editingProject.video_url || '';
      let imageUrls = editingProject.image_gallery_urls || [];
      let pdfUrls = editingProject.pdfs || [];
      const normalizedCategories = canonicalizeProjectCategories(data.category);

      // Upload thumbnail if changed
      if (data.thumbnailFile) {
        // First delete old thumbnail if it exists
        if (editingProject.thumbnail_url) {
          const oldPath = editingProject.thumbnail_url.split('/').pop();
          if (oldPath) {
            await supabase.storage.from('project-files').remove([oldPath]);
          }
        }

        // Upload new thumbnail
        const ext = data.thumbnailFile.name.split('.').pop();
        const name = `${crypto.randomUUID()}.${ext}`;
        const path = `${name}`;

        const { error } = await supabase.storage
          .from('project-files')
          .upload(path, data.thumbnailFile);
        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-files').getPublicUrl(path);
        thumbnailUrl = publicUrl;
      }

      // Upload video if changed
      // Handle video changes
      if (data.videoFile) {
        // Delete old video if it exists
        if (editingProject.video_url) {
          const oldPath = editingProject.video_url.split('/').pop();
          if (oldPath) {
            await supabase.storage.from('project-files').remove([oldPath]);
          }
        }

        // Upload new video
        const ext = data.videoFile.name.split('.').pop();
        const name = `${crypto.randomUUID()}.${ext}`;
        const path = `${name}`;

        const { error } = await supabase.storage.from('project-files').upload(path, data.videoFile);
        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-files').getPublicUrl(path);
        videoUrl = publicUrl;
      } else if (data.removeVideo) {
        // Delete video if user requested removal
        if (editingProject.video_url) {
          const oldPath = editingProject.video_url.split('/').pop();
          if (oldPath) {
            await supabase.storage.from('project-files').remove([oldPath]);
          }
          videoUrl = ''; // Set to empty string to remove the video
        }
      } else if (data.removeVideo === true && editingProject.video_url) {
        // Delete video if user removed it and didn't upload a new one
        const oldPath = editingProject.video_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('project-files').remove([oldPath]);
        }
        videoUrl = '';
      }

      // Handle PDF uploads - append new files
      if (data.pdfFiles?.length) {
        for (const file of data.pdfFiles) {
          const ext = file.name.split('.').pop();
          const name = `${crypto.randomUUID()}.${ext}`;
          const path = `pdf-files/${name}`;

          const { error } = await supabase.storage.from('project-files').upload(path, file);
          if (error) throw error;

          const {
            data: { publicUrl },
          } = supabase.storage.from('project-files').getPublicUrl(path);
          pdfUrls.push(publicUrl);
        }
      }

      // Handle deleted PDFs
      if (data.deletedPdfUrls?.length) {
        const pathsToDelete = data.deletedPdfUrls.map(url => url.split('/').pop()!);
        await supabase.storage.from('project-files').remove(pathsToDelete);
        pdfUrls = pdfUrls.filter(url => !data.deletedPdfUrls.includes(url));
      }

      // Handle image uploads - append new files
      if (data.imageFiles?.length) {
        for (const file of data.imageFiles) {
          const ext = file.name.split('.').pop();
          const name = `${crypto.randomUUID()}.${ext}`;
          const path = `project-files/${name}`;

          const { error } = await supabase.storage.from('project-files').upload(path, file);
          if (error) throw error;

          const {
            data: { publicUrl },
          } = supabase.storage.from('project-files').getPublicUrl(path);
          imageUrls.push(publicUrl);
        }
      }

      // Handle deleted images
      if (data.deletedImageUrls?.length) {
        const pathsToDelete = data.deletedImageUrls.map(url => url.split('/').pop()!);
        await supabase.storage.from('project-files').remove(pathsToDelete);
        imageUrls = imageUrls.filter(url => !data.deletedImageUrls.includes(url));
      }

      // Update project in database
      const { data: updatedProject, error } = await supabase
        .from('projects')
        .update({
          title: data.title,
          slug: slugify(data.title, { lower: true }),
          short_description: data.shortDescription,
          category: normalizedCategories,
          thumbnail_url: thumbnailUrl,
          full_title: data.fullTitle,
          description: data.description,
          visualization_type: data.visualizationType,
          tableau_embed_code: data.tableauCode,
          video_url: videoUrl || null,
          image_gallery_urls: imageUrls.length ? imageUrls : null,
          pdfs: pdfUrls.length ? pdfUrls : null,
          source_code_gist_url: data.sourceCodeGist,
          source_code_plaintext: data.sourceCodeText,
        })
        .eq('id', editingProject.id)
        .select()
        .single();

      if (error) throw error;

      setProjects(
        projects.map(project =>
          project.id === editingProject.id
            ? {
                ...updatedProject,
                category: canonicalizeProjectCategories(updatedProject.category),
              }
            : project
        )
      );

      toast.success('Project updated successfully!');
      resetForm();
      fetchProjects();
    } catch (err: any) {
      console.error('❌ Project update failed:', err);
      toast.error(err?.message || 'Failed to update project');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProjectVisibility = async (projectId: string, currentVisibility: boolean) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('projects')
        .update({ visibility: !currentVisibility })
        .eq('id', projectId);

      if (error) throw error;

      setProjects(
        projects.map(project =>
          project.id === projectId ? { ...project, visibility: !currentVisibility } : project
        )
      );
      toast.success(`Project ${!currentVisibility ? 'published' : 'hidden'}`);
    } catch (err) {
      toast.error('Failed to toggle visibility');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Portfolio Projects</h2>
        <p className="text-gray-600 mt-1">Manage your portfolio projects</p>
      </div>

      {/* Project Form */}
      <div className="p-6 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Project' : 'Add New Project'}
          </h3>
          {isEditing && (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              <X size={16} /> Cancel
            </button>
          )}
        </div>

        <UnifiedProjectForm
          key={`form-${formKey}`}
          onSubmit={isEditing ? handleUpdateProject : handleCreateProject}
          isLoading={isLoading}
          initialData={
            isEditing && editingProject
              ? {
                  title: editingProject.title,
                  shortDescription: editingProject.short_description,
                  category: canonicalizeProjectCategories(editingProject.category),
                  fullTitle: editingProject.full_title,
                  description: editingProject.description,
                  visualizationType: editingProject.visualization_type,
                  tableauCode: editingProject.tableau_embed_code,
                  videoUrl: editingProject.video_url,
                  imageUrls: editingProject.image_gallery_urls || [],
                  sourceCodeGist: editingProject.source_code_gist_url,
                  sourceCodeText: editingProject.source_code_plaintext,
                  thumbnailUrl: editingProject.thumbnail_url,
                  pdfUrls: editingProject.pdfs || [],
                }
              : undefined
          }
        />
      </div>
      {/* Project List */}
      <div className="divide-y divide-gray-200">
        {projects.map(project => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.visibility
                        ? 'text-green-800 bg-green-100'
                        : 'text-gray-800 bg-gray-100'
                    }`}
                  >
                    {project.visibility ? 'Visible' : 'Hidden'}
                  </span>
                </div>
                <p className="mt-1 text-gray-600">{project.short_description}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {canonicalizeProjectCategories(project.category).map(category => (
                    <span
                      key={category}
                      className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                    >
                      {getProjectCategoryLabel(category)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleProjectVisibility(project.id, project.visibility)}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  {project.visibility ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button
                  onClick={() => editProject(project)}
                  className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                  disabled={isLoading}
                >
                  <Edit size={18} />
                </button>
                {confirmDeleteId === project.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors"
                      disabled={isLoading}
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(project.id)}
                    className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {projects.length === 0 && (
          <div className="p-6 text-center text-gray-500">No projects added yet.</div>
        )}
      </div>
    </>
  );
};

export default PortfolioComponent;
