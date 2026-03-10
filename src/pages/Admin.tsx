import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Loader,
  Mail,
  Calendar,
  Check,
  Upload,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  GripVertical,
  Save,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import RichTextEditor from '../components/RichTextEditor';
import { FileUpload } from '../components/FileUpload';
import PortfolioComponent from '../components/PortfolioComponent';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
  read: boolean;
}

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
}

interface AboutSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface Resume {
  id: string;
  content: string;
  is_published: boolean;
}

interface Credential {
  id: string;
  title: string;
  content: string;
  file_url: string;
  type: 'degree' | 'transcript';
  is_published: boolean;
}

const Admin: React.FC = () => {
  // State declarations
  const [activeTab, setActiveTab] = useState<
    'messages' | 'portfolio' | 'about' | 'resume' | 'credentials'
  >('messages');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [aboutSections, setAboutSections] = useState<AboutSection[]>([]);
  const [aboutRowId, setAboutRowId] = useState<string>('');
  const [editingSections, setEditingSections] = useState<{ [key: string]: AboutSection }>({});
  const [newSection, setNewSection] = useState({
    title: '',
    content: '',
    order: 0,
  });
  const [resume, setResume] = useState<Resume | null>(null);
  const [resumeContent, setResumeContent] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [newCredential, setNewCredential] = useState({
    title: '',
    content: '',
    type: 'degree' as 'degree' | 'transcript',
    file: null as File | null,
  });
  const [isLoading, setIsLoading] = useState(false);

  console.log('resumeFile ', resumeFile);
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  console.log('aboutSections', aboutSections);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      else {
        console.log('data', data);
        setProjects(data || []);
      }
    } catch (error) {
      console.log('error', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('Not authenticated');
      }

      switch (activeTab) {
        case 'messages':
          await fetchMessages();
          break;
        case 'portfolio':
          await fetchProjects();
          break;
        case 'about':
          await fetchAboutSections();
          break;
        case 'resume':
          await fetchResume();
          break;
        case 'credentials':
          await fetchCredentials();
          break;
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch functions
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setMessages(data || []);
  };

  const fetchAboutSections = async () => {
    const { data, error } = await supabase
      .from('about_pages')
      .select('id, content')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    console.log('data', data);
    setAboutSections(data?.[0]?.content?.sections || []);
    setAboutRowId(data?.[0]?.id || '');
  };

  const fetchResume = async () => {
    const { data, error } = await supabase
      .from('resume_files')
      .select('*')
      .eq('is_published', true)
      .maybeSingle();

    if (error) throw error;

    console.log('resume data', data);
    setResume(data);
    setResumeContent(data?.content || '');
    setResumeFile(data?.file_url ? new File([data.file_url], data.file_name) : null);
  };

  const fetchCredentials = async () => {
    const { data, error } = await supabase
      .from('academic_credentials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setCredentials(data || []);
  };

  // Message actions
  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase.from('messages').update({ read: true }).eq('id', messageId);

      if (error) throw error;

      setMessages(messages.map(msg => (msg.id === messageId ? { ...msg, read: true } : msg)));
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase.from('messages').delete().eq('id', messageId);

      if (error) throw error;

      setMessages(messages.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  // About page actions
  const createSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newSections = [
        ...aboutSections,
        {
          id: crypto.randomUUID(),
          ...newSection,
          order: aboutSections.length,
        },
      ];

      const { error } = await supabase.from('about_pages').insert({
        content: { sections: newSections },
        is_published: true,
      });

      if (error) throw error;

      setAboutSections(newSections);
      setNewSection({
        title: '',
        content: '',
        order: 0,
      });
    } catch (err) {
      console.error('Error creating section:', err);
    }
  };

  const updateSection = async (tableId: string, sectionId: string, content: string) => {
    console.log('content', content);
    console.log('sectionId', sectionId);
    try {
      const updatedSections = aboutSections.map(section =>
        section.id === sectionId ? { ...section, content } : section
      );

      const { data, error } = await supabase
        .from('about_pages')
        .update({
          content: { sections: updatedSections },
          is_published: true,
        })
        .eq('id', tableId);

      if (error) throw error;

      console.log('data', data);

      setAboutSections(updatedSections);
      setEditingSections(prev => {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      });
    } catch (err) {
      console.error('Error updating section:', err);
    }
  };

  const deleteSection = async (aboutRowId: string, sectionId: string) => {
    try {
      const updatedSections = aboutSections.filter(section => section.id !== sectionId);

      const { error } = await supabase
        .from('about_pages')
        .update({
          content: { sections: updatedSections },
          is_published: true,
        })
        .eq('id', aboutRowId);

      if (error) throw error;
      setAboutSections(updatedSections);
    } catch (err) {
      console.error('Error deleting section:', err);
    }
  };

  // Resume actions
  const updateResume = async () => {
    try {
      let resumeId = resume?.id;

      if (!resumeId) {
        const { data: newResume, error: insertError } = await supabase
          .from('resumes')
          .insert({
            content: resumeContent,
            is_published: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        resumeId = newResume.id;
      } else {
        const { error: updateError } = await supabase
          .from('resumes')
          .update({
            content: resumeContent,
            is_published: true,
          })
          .eq('id', resumeId);

        if (updateError) throw updateError;
      }

      await fetchResume();
    } catch (err) {
      console.error('Error updating resume:', err);
    }
  };

  const uploadResumeFile = async () => {
    console.log('resumeFile 2', resumeFile);

    if (!resumeFile) {
      toast.error('Select a file to upload');
      return;
    }

    setIsLoading(true);
    try {
      const fileExt = resumeFile?.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `resumes/${fileName}`;
      const bucket = 'resumes';

      // Upload new file
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, resumeFile);

      if (uploadError) {
        throw uploadError;
      } else {
        console.log('resume upload data', data);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      console.log('publicUrl received', publicUrl);

      // Upsert row with specific ID
      const { error: dbError } = await supabase
        .from('resume_files')
        .upsert(
          {
            id: '1739dd2c-86df-4fd8-b891-2d4d654541e8',
            file_url: publicUrl,
            updated_at: new Date().toISOString(),
            is_published: true, // ensure this field is set for upsert logic
            file_name: fileName,
            content_type: 'application/pdf',
            content: resumeContent,
          },
          { onConflict: ['id'] } // ensure 'id' is the primary or unique key
        )
        .select(); // to ensure mutation is triggered

      if (dbError) {
        throw dbError;
      }

      setResumeFile(null);
      toast.success('Resume uploaded successfully');
      await fetchResume();
    } catch (err) {
      console.error('Error uploading resume:', err);
      toast.error('Failed to upload resume');
    } finally {
      setIsLoading(false);
    }
  };

  // Credential actions
  const toggleCredentialVisibility = async (credentialId: string, currentVisibility: boolean) => {
    console.log('credentialId', credentialId);
    try {
      const { error } = await supabase
        .from('academic_credentials')
        .update({ is_published: !currentVisibility })
        .eq('id', credentialId);

      if (error) throw error;

      setCredentials(
        credentials.map(credential =>
          credential.id === credentialId
            ? { ...credential, is_published: !currentVisibility }
            : credential
        )
      );
    } catch (err) {
      console.error('Error toggling credential visibility:', err);
    }
  };

  const uploadCredential = async () => {
    if (!newCredential.file) return;

    console.log('newCredential.file', newCredential.file);
    try {
      setIsLoading(true);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;
      if (!session) throw new Error('No session found');

      const fileExt = newCredential.file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${session.user.id}/credentials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('credentials')
        .upload(filePath, newCredential.file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('credentials').getPublicUrl(filePath);

      const { data, error: insertError } = await supabase
        .from('academic_credentials')
        .insert({
          title: newCredential.title,
          content: newCredential.content,
          content_type: newCredential.file.type,
          type: newCredential.type,
          file_url: publicUrl,
          is_published: true,
        })
        .select();

      if (insertError) throw insertError;

      setCredentials([data[0], ...credentials]);
      setNewCredential({
        title: '',
        type: 'degree',
        content: '',
        file: null,
      });
    } catch (err) {
      console.error('Error uploading credential:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCredential = async (credentialId: string, fileUrl: string) => {
    try {
      setIsLoading(true);

      // Get the current session to access user ID
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      // Print the fileUrl for debugging
      console.log('Full file URL:', fileUrl);

      // Extract the file path from the URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');

      // The path will be something like: /storage/v1/object/public/credentials/userid/credentials/filename
      // So we need to get everything after 'public/credentials/'
      const publicIndex = pathParts.indexOf('public');
      if (publicIndex === -1 || publicIndex >= pathParts.length - 1) {
        throw new Error('Invalid file URL structure');
      }

      // Reconstruct the full storage path
      const filePath = pathParts.slice(publicIndex + 2).join('/');
      console.log('Extracted file path:', filePath);
      console.log('credentialId', credentialId);

      // Delete from storage
      const { error: storageError } = await supabase.storage.from('credentials').remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('academic_credentials')
        .delete()
        .eq('id', credentialId);

      if (dbError) throw dbError;

      setCredentials(credentials.filter(c => c.id !== credentialId));
    } catch (err) {
      console.error('Error deleting credential:', err);
      // You might want to add user feedback here
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin h-8 w-8 text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{error}</h2>
          {error === 'Not authenticated' && (
            <p className="text-gray-600">Please log in to access the admin panel.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto py-12 px-4"
    >
      <h1 className="text-4xl font-bold mb-8 text-red-200">Admin Panel</h1>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        {(['messages', 'portfolio', 'about', 'resume', 'credentials'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab
                ? 'bg-red-200 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Messages Section */}
        {activeTab === 'messages' && (
          <>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
              <p className="text-gray-600 mt-1">Manage incoming messages from the contact form</p>
            </div>

            <div className="divide-y divide-gray-200">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`p-6 transition-colors ${message.read ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{message.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail size={16} />
                          <a
                            href={`mailto:${message.email}`}
                            className="text-red-200 hover:text-red-300"
                          >
                            {message.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          {new Date(message.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="mt-4 text-gray-700 whitespace-pre-wrap">{message.message}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!message.read && (
                        <button
                          onClick={() => markAsRead(message.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-200 hover:text-red-300 transition-colors"
                        >
                          <Check size={16} />
                          Mark as Read
                        </button>
                      )}
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-200 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {messages.length === 0 && (
                <div className="p-6 text-center text-gray-500">No messages received yet.</div>
              )}
            </div>
          </>
        )}
        {/* Portfolio Section */}
        {activeTab === 'portfolio' && (
          <PortfolioComponent
            fetchProjects={fetchProjects}
            projects={projects}
            setProjects={setProjects}
          />
        )}
        {/* About Section */}
        {activeTab === 'about' && (
          <>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">About Page</h2>
              <p className="text-gray-600 mt-1">Manage your about page content</p>
            </div>

            {/* Sections List */}
            <div className="divide-y divide-gray-200">
              {aboutSections.map(section => (
                <div
                  key={section.id}
                  className="p-6"
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('text/plain', section.id);
                  }}
                  onDragOver={e => {
                    e.preventDefault();
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId !== section.id) {
                      const draggedSection = aboutSections.find(s => s.id === draggedId);
                      const targetSection = section;
                      if (draggedSection && targetSection) {
                        const newSections = aboutSections.map(s => {
                          if (s.id === draggedId) {
                            return { ...s, order: targetSection.order };
                          }
                          if (s.id === targetSection.id) {
                            return { ...s, order: draggedSection.order };
                          }
                          return s;
                        });
                        setAboutSections(newSections.sort((a, b) => a.order - b.order));
                      }
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="cursor-move">
                      <GripVertical size={20} className="text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingSections(prev => ({
                                ...prev,
                                [section.id]: section,
                              }));
                            }}
                            className="text-red-200 hover:text-red-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSection(aboutRowId, section.id)}
                            className="text-red-200 hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {editingSections[section.id] ? (
                        <div className="space-y-4">
                          <RichTextEditor
                            content={editingSections[section.id].content}
                            onChange={content => {
                              setEditingSections(prev => ({
                                ...prev,
                                [section.id]: {
                                  ...prev[section.id],
                                  content,
                                },
                              }));
                            }}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingSections(prev => {
                                  const next = { ...prev };
                                  delete next[section.id];
                                  return next;
                                });
                              }}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() =>
                                updateSection(
                                  aboutRowId,
                                  section.id,
                                  editingSections[section.id].content
                                )
                              }
                              className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-red-200 rounded hover:bg-red-300"
                            >
                              <Save size={16} />
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {aboutSections.length === 0 && (
                <div className="p-6 text-center text-gray-500">No sections added yet.</div>
              )}
            </div>

            {/* New Section Form */}
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Section</h3>
              <form onSubmit={createSection} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Section Title</label>
                  <input
                    type="text"
                    value={newSection.title}
                    onChange={e => setNewSection({ ...newSection, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Content</label>
                  <RichTextEditor
                    content={newSection.content}
                    onChange={content => setNewSection({ ...newSection, content })}
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-200 hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Plus size={16} className="mr-2" />
                  Add Section
                </button>
              </form>
            </div>
          </>
        )}
        {/* Resume Section */}
        {activeTab === 'resume' && (
          <>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Resume</h2>
              <p className="text-gray-600 mt-1">Manage your resume content and files</p>
            </div>

            <div className="p-6 space-y-8">
              {/* Resume Content Editor */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resume Content</h3>
                <RichTextEditor content={resumeContent} onChange={setResumeContent} />
                {/* Resume File Upload */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 my-4">Upload Resume File</h3>
                  <FileUpload
                    accept={{
                      'application/pdf': ['.pdf'],
                    }}
                    maxFiles={1}
                    onFileSelect={files => {
                      if (files[0]) {
                        setResumeFile(files[0]);
                      }
                    }}
                    selectedFiles={resumeFile ? [resumeFile] : []}
                    onRemoveFile={() => setResumeFile(null)}
                    label="resume file"
                  />
                </div>
                <div className="mt-4">
                  <button
                    onClick={uploadResumeFile}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-200 hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    {isLoading ? 'Uploading...' : 'Upload Resume'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        {/* Credentials Section */}

        {activeTab === 'credentials' && (
          <>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Academic Credentials</h2>
              <p className="text-gray-600 mt-1">
                Manage your academic credentials and certificates
              </p>
            </div>

            {/* Add New Credential Form */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Credential</h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={newCredential.title}
                    onChange={e => setNewCredential({ ...newCredential, title: e.target.value })}
                    className="border border-gray-300 rounded-md p-2"
                    required
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <RichTextEditor
                    content={newCredential.content}
                    onChange={content => setNewCredential({ ...newCredential, content })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">File</label>
                  <FileUpload
                    accept={{
                      'application/pdf': ['.pdf'],
                      'image/*': ['.png', '.jpg', '.jpeg'],
                    }}
                    maxFiles={1}
                    onFileSelect={files => {
                      if (files[0]) {
                        setNewCredential({ ...newCredential, file: files[0] });
                      }
                    }}
                    selectedFiles={newCredential.file ? [newCredential.file] : []}
                    onRemoveFile={() => setNewCredential({ ...newCredential, file: null })}
                    label="credential file"
                  />
                </div>

                <button
                  onClick={uploadCredential}
                  disabled={!newCredential.title || !newCredential.file || isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-200 hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Credential
                </button>
              </div>
            </div>

            {/* Credentials List */}
            <div className="divide-y divide-gray-200">
              {credentials.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No credentials added yet.</div>
              ) : (
                credentials.map(credential => (
                  <div key={credential.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{credential.title}</h3>
                        <div
                          className="prose max-w-none mt-2"
                          dangerouslySetInnerHTML={{ __html: credential.content }}
                        />
                        <p className="mt-2 text-sm text-gray-500">
                          Status: {credential.is_published ? 'Published' : 'Hidden'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            toggleCredentialVisibility(credential.id, credential.is_published)
                          }
                          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-200 hover:text-red-300 transition-colors"
                        >
                          {credential.is_published ? (
                            <>
                              <EyeOff size={16} />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye size={16} />
                              Show
                            </>
                          )}
                        </button>
                        <a
                          href={credential.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-200 hover:text-red-300 transition-colors"
                        >
                          View File
                        </a>
                        <button
                          onClick={() => deleteCredential(credential.id, credential.file_url)}
                          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-200 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Admin;
