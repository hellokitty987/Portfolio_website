import React, { useState } from 'react';
import UnifiedProjectForm, { type ProjectFormData } from './UnifiedProjectForm';
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  GripVertical,
  Loader,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import slugify from 'slugify';
import { toast } from 'react-hot-toast';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  canonicalizeProjectCategories,
  getProjectCategoryBadgeClassName,
  getProjectCategoryLabel,
  getProjectCategorySectionStyles,
} from '../lib/projectCategories';
import {
  getProjectCategoryPriorityIndex,
  getProjectPrimaryCategory,
  normalizeProjectOrderingFields,
  sortProjectsForCategory,
  type ProjectCategorySortOrder,
} from '../lib/projectSortOrder';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string[];
  category_sort_order: ProjectCategorySortOrder;
  visibility: boolean;
  created_at: string;
  thumbnail_url: string;
  full_title: string;
  short_description: string;
  source_code_gist_url: string | null;
  source_code_plaintext?: string | null;
  visualization_type: 'tableau' | 'video' | 'image_gallery';
  tableau_embed_code: string | null;
  video_url: string | null;
  image_gallery_urls: string[] | null;
  pdfs?: string[] | null;
  slug: string;
}

type ProjectGroup = {
  key: string;
  label: string;
  projects: Project[];
};

type SortableProjectCardProps = {
  project: Project;
  confirmDeleteId: string | null;
  isBusy: boolean;
  isSavingOrder: boolean;
  isSortable: boolean;
  onDelete: (projectId: string) => void;
  onEdit: (project: Project) => void;
  onRequestDelete: (projectId: string | null) => void;
  onToggleVisibility: (projectId: string, currentVisibility: boolean) => void;
};

const applyCategoryOrderToProjects = (
  projects: Project[],
  categoryKey: string,
  orderedProjectIds: string[],
) => {
  const orderedPositions = new Map(
    orderedProjectIds.map((projectId, index) => [projectId, index] as const),
  );

  return projects.map(project => {
    const nextPosition = orderedPositions.get(project.id);

    if (nextPosition === undefined) {
      return project;
    }

    return {
      ...project,
      category_sort_order: {
        ...project.category_sort_order,
        [categoryKey]: nextPosition,
      },
    };
  });
};

const SortableProjectCard = ({
  project,
  confirmDeleteId,
  isBusy,
  isSavingOrder,
  isSortable,
  onDelete,
  onEdit,
  onRequestDelete,
  onToggleVisibility,
}: SortableProjectCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    disabled: isBusy || isSavingOrder || !isSortable,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`bg-white/75 p-6 transition-colors hover:bg-white ${
        isDragging ? 'relative z-10 shadow-xl ring-2 ring-[#FECACA]' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          className={`mt-1 rounded-lg border border-black/10 bg-white p-2 text-gray-400 transition-colors ${
            isSortable && !isBusy && !isSavingOrder
              ? 'cursor-grab hover:text-gray-700 active:cursor-grabbing'
              : 'cursor-not-allowed opacity-60'
          }`}
          disabled={isBusy || isSavingOrder || !isSortable}
          aria-label={`Reorder ${project.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    project.visibility
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {project.visibility ? 'Visible' : 'Hidden'}
                </span>
              </div>
              <p className="mt-1 text-gray-600">{project.short_description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {canonicalizeProjectCategories(project.category).map(category => (
                  <span
                    key={category}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${getProjectCategoryBadgeClassName(
                      category,
                    )}`}
                  >
                    {getProjectCategoryLabel(category)}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleVisibility(project.id, project.visibility)}
                className="p-2 text-gray-500 transition-colors hover:text-gray-700"
                disabled={isBusy}
              >
                {project.visibility ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button
                type="button"
                onClick={() => onEdit(project)}
                className="p-2 text-gray-500 transition-colors hover:text-blue-600"
                disabled={isBusy}
              >
                <Edit size={18} />
              </button>
              {confirmDeleteId === project.id ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onDelete(project.id)}
                    className="p-2 text-red-500 transition-colors hover:text-red-700"
                    disabled={isBusy}
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDelete(null)}
                    className="p-2 text-gray-500 transition-colors hover:text-gray-700"
                    disabled={isBusy}
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onRequestDelete(project.id)}
                  className="p-2 text-gray-500 transition-colors hover:text-red-500"
                  disabled={isBusy}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PortfolioComponent = ({
  fetchProjects,
  projects,
  setProjects,
}: {
  fetchProjects: () => Promise<void>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [savingGroupOrder, setSavingGroupOrder] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const resetForm = () => {
    setEditingProject(null);
    setIsEditing(false);
    setFormKey(prev => prev + 1);
  };

  const handleCreateProject = async (data: ProjectFormData) => {
    setIsLoading(true);
    try {
      let thumbnailUrl = '';
      let videoUrl = '';
      const imageUrls: string[] = [];
      const pdfUrls: string[] = [];

      if (data.thumbnailFile) {
        const ext = data.thumbnailFile.name.split('.').pop();
        const name = `${crypto.randomUUID()}.${ext}`;
        const path = `${name}`;

        const { error } = await supabase.storage
          .from('project-files')
          .upload(path, data.thumbnailFile);
        if (error) {
          throw error;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-files').getPublicUrl(path);
        thumbnailUrl = publicUrl;
      }

      if (data.pdfFiles?.length) {
        for (const file of data.pdfFiles) {
          const ext = file.name.split('.').pop();
          const name = `${crypto.randomUUID()}.${ext}`;
          const path = `pdf-files/${name}`;

          const { error } = await supabase.storage.from('project-files').upload(path, file);
          if (error) {
            throw error;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('project-files').getPublicUrl(path);
          pdfUrls.push(publicUrl);
        }
      }

      if (data.videoFile) {
        const ext = data.videoFile.name.split('.').pop();
        const name = `${crypto.randomUUID()}.${ext}`;
        const path = `${name}`;

        const { error } = await supabase.storage.from('project-files').upload(path, data.videoFile);
        if (error) {
          throw error;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-files').getPublicUrl(path);
        videoUrl = publicUrl;
      }

      if (data.imageFiles?.length) {
        for (const file of data.imageFiles) {
          const ext = file.name.split('.').pop();
          const name = `${crypto.randomUUID()}.${ext}`;
          const path = `project-files/${name}`;

          const { error } = await supabase.storage.from('project-files').upload(path, file);
          if (error) {
            throw error;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('project-files').getPublicUrl(path);
          imageUrls.push(publicUrl);
        }
      }

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

      if (error) {
        throw error;
      }

      setProjects(prev => [normalizeProjectOrderingFields(project as Project), ...prev]);
      toast.success('Project created successfully!');
      resetForm();
      await fetchProjects();
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

      const project = projects.find(currentProject => currentProject.id === projectId);
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

      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) {
        throw error;
      }

      setProjects(prev => prev.filter(project => project.id !== projectId));
      toast.success('Project deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete project');
      console.error(err);
    } finally {
      setIsLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const handleUpdateProject = async (data: ProjectFormData) => {
    if (!editingProject) {
      return;
    }

    setIsLoading(true);
    try {
      let thumbnailUrl = editingProject.thumbnail_url;
      let videoUrl = editingProject.video_url || '';
      let imageUrls = editingProject.image_gallery_urls || [];
      let pdfUrls = editingProject.pdfs || [];
      const normalizedCategories = canonicalizeProjectCategories(data.category);

      if (data.thumbnailFile) {
        if (editingProject.thumbnail_url) {
          const oldPath = editingProject.thumbnail_url.split('/').pop();
          if (oldPath) {
            await supabase.storage.from('project-files').remove([oldPath]);
          }
        }

        const ext = data.thumbnailFile.name.split('.').pop();
        const name = `${crypto.randomUUID()}.${ext}`;
        const path = `${name}`;

        const { error } = await supabase.storage
          .from('project-files')
          .upload(path, data.thumbnailFile);
        if (error) {
          throw error;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-files').getPublicUrl(path);
        thumbnailUrl = publicUrl;
      }

      if (data.videoFile) {
        if (editingProject.video_url) {
          const oldPath = editingProject.video_url.split('/').pop();
          if (oldPath) {
            await supabase.storage.from('project-files').remove([oldPath]);
          }
        }

        const ext = data.videoFile.name.split('.').pop();
        const name = `${crypto.randomUUID()}.${ext}`;
        const path = `${name}`;

        const { error } = await supabase.storage.from('project-files').upload(path, data.videoFile);
        if (error) {
          throw error;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-files').getPublicUrl(path);
        videoUrl = publicUrl;
      } else if (data.removeVideo && editingProject.video_url) {
        const oldPath = editingProject.video_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('project-files').remove([oldPath]);
        }
        videoUrl = '';
      }

      if (data.pdfFiles?.length) {
        for (const file of data.pdfFiles) {
          const ext = file.name.split('.').pop();
          const name = `${crypto.randomUUID()}.${ext}`;
          const path = `pdf-files/${name}`;

          const { error } = await supabase.storage.from('project-files').upload(path, file);
          if (error) {
            throw error;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('project-files').getPublicUrl(path);
          pdfUrls.push(publicUrl);
        }
      }

      if (data.deletedPdfUrls?.length) {
        const pathsToDelete = data.deletedPdfUrls.map(url => url.split('/').pop()!);
        await supabase.storage.from('project-files').remove(pathsToDelete);
        pdfUrls = pdfUrls.filter(url => !data.deletedPdfUrls?.includes(url));
      }

      if (data.imageFiles?.length) {
        for (const file of data.imageFiles) {
          const ext = file.name.split('.').pop();
          const name = `${crypto.randomUUID()}.${ext}`;
          const path = `project-files/${name}`;

          const { error } = await supabase.storage.from('project-files').upload(path, file);
          if (error) {
            throw error;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('project-files').getPublicUrl(path);
          imageUrls.push(publicUrl);
        }
      }

      if (data.deletedImageUrls?.length) {
        const pathsToDelete = data.deletedImageUrls.map(url => url.split('/').pop()!);
        await supabase.storage.from('project-files').remove(pathsToDelete);
        imageUrls = imageUrls.filter(url => !data.deletedImageUrls?.includes(url));
      }

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

      if (error) {
        throw error;
      }

      const normalizedProject = normalizeProjectOrderingFields(updatedProject as Project);
      setProjects(prevProjects =>
        prevProjects.map(project => (project.id === editingProject.id ? normalizedProject : project)),
      );

      toast.success('Project updated successfully!');
      resetForm();
      await fetchProjects();
    } catch (err: unknown) {
      console.error('Project update failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update project');
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

      if (error) {
        throw error;
      }

      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === projectId ? { ...project, visibility: !currentVisibility } : project,
        ),
      );
      toast.success(`Project ${!currentVisibility ? 'published' : 'hidden'}`);
    } catch (err) {
      toast.error('Failed to toggle visibility');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (
    groupKey: string,
    groupProjects: Project[],
    event: DragEndEvent,
  ) => {
    if (groupKey === 'uncategorized' || savingGroupOrder[groupKey]) {
      return;
    }

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const currentProjects = sortProjectsForCategory(groupProjects, groupKey);
    const oldIndex = currentProjects.findIndex(project => project.id === active.id);
    const newIndex = currentProjects.findIndex(project => project.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedProjects = arrayMove(currentProjects, oldIndex, newIndex);
    const orderedProjectIds = reorderedProjects.map(project => project.id);
    const previousProjects = projects;

    setProjects(prevProjects => applyCategoryOrderToProjects(prevProjects, groupKey, orderedProjectIds));
    setSavingGroupOrder(current => ({
      ...current,
      [groupKey]: true,
    }));

    try {
      const { error } = await supabase.rpc('reorder_projects_in_category', {
        category_key: groupKey,
        ordered_project_ids: orderedProjectIds,
      });

      if (error) {
        throw error;
      }

      toast.success(`${getProjectCategoryLabel(groupKey)} order updated`);
      await fetchProjects();
    } catch (err) {
      setProjects(previousProjects);
      console.error('Project reorder failed:', err);
      toast.error('Failed to save project order');
    } finally {
      setSavingGroupOrder(current => ({
        ...current,
        [groupKey]: false,
      }));
    }
  };

  const projectGroups = projects.reduce<ProjectGroup[]>((groups, project) => {
    const primaryCategory = getProjectPrimaryCategory(project.category);
    const existingGroup = groups.find(group => group.key === primaryCategory);

    if (existingGroup) {
      existingGroup.projects.push(project);
      return groups;
    }

    groups.push({
      key: primaryCategory,
      label: primaryCategory === 'uncategorized' ? 'Uncategorized' : getProjectCategoryLabel(primaryCategory),
      projects: [project],
    });

    return groups;
  }, []);

  projectGroups.forEach(group => {
    group.projects = sortProjectsForCategory(group.projects, group.key);
  });

  projectGroups.sort(
    (leftGroup, rightGroup) =>
      getProjectCategoryPriorityIndex(leftGroup.key) - getProjectCategoryPriorityIndex(rightGroup.key),
  );

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(current => ({
      ...current,
      [groupKey]: !(current[groupKey] ?? true),
    }));
  };

  return (
    <>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Portfolio Projects</h2>
        <p className="text-gray-600 mt-1">Manage your portfolio projects</p>
      </div>

      <div className="p-6 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Project' : 'Add New Project'}
          </h3>
          {isEditing && (
            <button
              type="button"
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
                  tableauCode: editingProject.tableau_embed_code || '',
                  videoUrl: editingProject.video_url || '',
                  imageUrls: editingProject.image_gallery_urls || [],
                  sourceCodeGist: editingProject.source_code_gist_url || '',
                  sourceCodeText: editingProject.source_code_plaintext || '',
                  thumbnailUrl: editingProject.thumbnail_url,
                  pdfUrls: editingProject.pdfs || [],
                }
              : undefined
          }
        />
      </div>

      <div className="space-y-6 p-6">
        {projectGroups.map(group => {
          const sectionStyles = getProjectCategorySectionStyles(group.key);
          const isCollapsed = collapsedGroups[group.key] ?? true;
          const isSavingOrder = Boolean(savingGroupOrder[group.key]);
          const isSortable = group.key !== 'uncategorized';

          return (
            <section
              key={group.key}
              className={`relative isolate overflow-hidden rounded-2xl border shadow-sm ${sectionStyles.shell}`}
            >
              <button
                type="button"
                onClick={() => toggleGroupCollapse(group.key)}
                className={`flex w-full items-center justify-between bg-white/90 px-5 py-4 text-left ${
                  isCollapsed ? '' : 'border-b border-black/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${sectionStyles.accent}`} />
                  <h4 className="text-base font-semibold text-gray-900">{group.label}</h4>
                </div>

                <div className="flex items-center gap-3">
                  {isSavingOrder && <Loader size={16} className="animate-spin text-gray-500" />}
                  <span className="text-xs text-gray-500">
                    {isSortable ? 'Drag to reorder' : 'Order follows fallback'}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${sectionStyles.countBadge}`}
                  >
                    {group.projects.length} {group.projects.length === 1 ? 'project' : 'projects'}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight size={18} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-500" />
                  )}
                </div>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-black/5 bg-white/80">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={event => void handleDragEnd(group.key, group.projects, event)}
                  >
                    <SortableContext
                      items={group.projects.map(project => project.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {group.projects.map(project => (
                        <SortableProjectCard
                          key={project.id}
                          project={project}
                          confirmDeleteId={confirmDeleteId}
                          isBusy={isLoading}
                          isSavingOrder={isSavingOrder}
                          isSortable={isSortable}
                          onDelete={deleteProject}
                          onEdit={editProject}
                          onRequestDelete={setConfirmDeleteId}
                          onToggleVisibility={toggleProjectVisibility}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </section>
          );
        })}

        {projects.length === 0 && (
          <div className="p-6 text-center text-gray-500">No projects added yet.</div>
        )}
      </div>
    </>
  );
};

export default PortfolioComponent;
