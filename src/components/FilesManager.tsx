'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { putFileBlob, getFileBlob, deleteFileBlob } from '@/lib/db';
import { addToRecentFiles } from '@/components/CommandPalette';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Upload,
  Download,
  Trash2,
  Search,
  FileText,
  Image as ImageIcon,
  File,
  Video,
  Music,
  Archive,
  Eye,
  Copy,
  FolderOpen,
  Grid3X3,
  List,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  HardDrive,
  X,
  Palette,
  Hash,
  FolderPlus,
  Edit3,
  Check,
  Sparkles,
  Brain,
  Loader2,
  Wand2,
  Heart
} from 'lucide-react';

export interface SavedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: string;
  hasBlob: boolean; // Indicates if blob is stored in IndexedDB
  category: string;
  projectId: string;
  preview?: string; // For images (object URL)
  favorite?: boolean; // Whether file is favorited
  description?: string; // User-added description or prompt
}

export interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  fileCount: number;
}

interface FileCategory {
  name: string;
  icon: React.ReactNode;
  types: string[];
  color: string;
}

const FILE_CATEGORIES: FileCategory[] = [
  {
    name: 'Images',
    icon: <ImageIcon className="w-4 h-4" />,
    types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    color: 'rgb(34, 197, 94)'
  },
  {
    name: 'Documents',
    icon: <FileText className="w-4 h-4" />,
    types: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    color: 'rgb(59, 130, 246)'
  },
  {
    name: 'Videos',
    icon: <Video className="w-4 h-4" />,
    types: ['video/mp4', 'video/webm', 'video/quicktime'],
    color: 'rgb(147, 51, 234)'
  },
  {
    name: 'Audio',
    icon: <Music className="w-4 h-4" />,
    types: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    color: 'rgb(249, 115, 22)'
  },
  {
    name: 'Archives',
    icon: <Archive className="w-4 h-4" />,
    types: ['application/zip', 'application/x-rar-compressed'],
    color: 'rgb(107, 114, 128)'
  },
  {
    name: 'Other',
    icon: <File className="w-4 h-4" />,
    types: [],
    color: 'rgb(107, 114, 128)'
  }
];

const STORAGE_KEY = 'grok-files-manager';
const FILES_PROJECTS_STORAGE_KEY = 'grok-files-projects';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB limit for IndexedDB

// Project colors matching prompt library
const PROJECT_COLORS = [
  { name: 'Purple', value: 'rgb(147, 51, 234)', bg: 'rgb(147, 51, 234, 0.1)' },
  { name: 'Blue', value: 'rgb(59, 130, 246)', bg: 'rgb(59, 130, 246, 0.1)' },
  { name: 'Green', value: 'rgb(34, 197, 94)', bg: 'rgb(34, 197, 94, 0.1)' },
  { name: 'Orange', value: 'rgb(249, 115, 22)', bg: 'rgb(249, 115, 22, 0.1)' },
  { name: 'Red', value: 'rgb(239, 68, 68)', bg: 'rgb(239, 68, 68, 0.1)' },
  { name: 'Pink', value: 'rgb(236, 72, 153)', bg: 'rgb(236, 72, 153, 0.1)' },
  { name: 'Indigo', value: 'rgb(99, 102, 241)', bg: 'rgb(99, 102, 241, 0.1)' },
  { name: 'Teal', value: 'rgb(20, 184, 166)', bg: 'rgb(20, 184, 166, 0.1)' },
  { name: 'Brown', value: 'rgb(161, 98, 7)', bg: 'rgb(161, 98, 7, 0.1)' },
  { name: 'Gray', value: 'rgb(107, 114, 128)', bg: 'rgb(107, 114, 128, 0.1)' }
];

export default function FilesManager({ files, setFiles, projects, setProjects, selectedProjectId, setSelectedProjectId }: { files: SavedFile[], setFiles: (files: SavedFile[]) => void, projects: Project[], setProjects: (projects: Project[]) => void, selectedProjectId: string, setSelectedProjectId: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFile, setSelectedFile] = useState<SavedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [aiNamingFiles, setAiNamingFiles] = useState<Set<string>>(new Set());
  const [showAiSuggestion, setShowAiSuggestion] = useState<{fileId: string, suggestion: string} | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [descriptionValue, setDescriptionValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);


  // Get file category
  const getFileCategory = useCallback((fileType: string): FileCategory => {
    return FILE_CATEGORIES.find(cat => cat.types.includes(fileType)) || FILE_CATEGORIES[FILE_CATEGORIES.length - 1];
  }, []);

  // Load files and projects from localStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load files
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const loadedFiles: SavedFile[] = JSON.parse(saved);

          // Generate missing previews for images and fix broken ones
          const filesWithPreviews = await Promise.all(
            loadedFiles.map(async (file) => {
              // Always regenerate previews for images and videos to fix broken object URLs after refresh
              if (file.hasBlob && (getFileCategory(file.type).name === 'Images' || getFileCategory(file.type).name === 'Videos')) {
                try {
                  const blob = await getFileBlob(file.id);
                  if (blob) {
                    // Revoke old object URL if it exists to prevent memory leaks
                    if (file.preview) {
                      URL.revokeObjectURL(file.preview);
                    }
                    const newPreview = URL.createObjectURL(blob);
                    return { ...file, preview: newPreview };
                  }
                } catch (error) {
                  console.error('Failed to generate preview for:', file.name, error);
                }
              }
              return file;
            })
          );

          setFiles(filesWithPreviews);

          // Save the updated files with new preview URLs back to localStorage
          if (filesWithPreviews.some(f => f.preview !== loadedFiles.find(lf => lf.id === f.id)?.preview)) {
            setTimeout(() => {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(filesWithPreviews));
              console.log('💾 Updated preview URLs saved to localStorage');
            }, 100);
          }
        }

        // Load projects
        const savedProjects = localStorage.getItem(FILES_PROJECTS_STORAGE_KEY);
        if (savedProjects) {
          const parsedProjects = JSON.parse(savedProjects);
          setProjects(parsedProjects);
          if (parsedProjects.length > 0) {
            setSelectedProjectId(parsedProjects[0].id);
          }
        } else {
          // Create default project
          const defaultProject: Project = {
            id: 'default',
            name: 'General',
            color: PROJECT_COLORS[0].value,
            description: 'Default project for files',
            createdAt: new Date().toISOString(),
            fileCount: 0
          };
          setProjects([defaultProject]);
          setSelectedProjectId(defaultProject.id);
          localStorage.setItem(FILES_PROJECTS_STORAGE_KEY, JSON.stringify([defaultProject]));
        }
      } catch (error) {
        console.error('Failed to load files:', error);
      }
    };

    loadData();
  }, [getFileCategory]);

  // Handle escape key for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedFile) {
        setSelectedFile(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedFile]);

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      // Revoke all object URLs to prevent memory leaks
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  // Save files to localStorage with immediate persistence
  const saveToStorage = useCallback((files: SavedFile[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
      console.log('💾 saveToStorage: Saved', files.length, 'files to localStorage');

      // Trigger storage event for other components to refresh
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify(files),
        url: window.location.href
      }));

      // Also dispatch a custom event
      window.dispatchEvent(new CustomEvent('filesUpdated', {
        detail: { files }
      }));

    } catch (error) {
      console.error('❌ Failed to save files:', error);
      toast.error('Failed to save files to storage');
    }
  }, []);

  // Save projects to localStorage
  const saveProjectsToStorage = useCallback((projects: Project[]) => {
    try {
      localStorage.setItem(FILES_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('Failed to save projects:', error);
      toast.error('Failed to save projects to storage');
    }
  }, []);

  // Create new project
  const createProject = useCallback(() => {
    if (!newProjectName.trim()) {
      toast.warning('Please enter a project name');
      return;
    }

    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: newProjectName.trim(),
      color: newProjectColor.value,
      createdAt: new Date().toISOString(),
      fileCount: 0
    };

    setProjects((prev: Project[]) => {
      const updated = [...prev, newProject];
      saveProjectsToStorage(updated);
      return updated;
    });

    setSelectedProjectId(newProject.id);
    setNewProjectName('');
    setNewProjectColor(PROJECT_COLORS[0]);
    setShowProjectModal(false);
    toast.success(`Project "${newProject.name}" created!`);
  }, [newProjectName, newProjectColor, saveProjectsToStorage]);

  // Get project by ID
  const getProject = useCallback((projectId: string) => {
    return projects.find(p => p.id === projectId);
  }, [projects]);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // Simple, bulletproof file upload using IndexedDB
  const handleFileUpload = useCallback(async (fileList: FileList) => {
    const fileArray = Array.from(fileList);
    console.log('🚀 Starting file upload for:', fileArray.map(f => f.name));

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" is too large. Maximum size is 25MB.`);
        continue;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const category = getFileCategory(file.type);

        // Store the actual file blob in IndexedDB
        await putFileBlob(fileId, file);
        console.log('✅ Stored blob in IndexedDB:', fileId);

        // Create preview for images and videos
        let preview: string | undefined;
        if (category.name === 'Images' || category.name === 'Videos') {
          preview = URL.createObjectURL(file);
        }

        // Create lightweight metadata for localStorage
        const newFile: SavedFile = {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date().toISOString(),
          hasBlob: true,
          category: category.name,
          projectId: '',
          preview
        };

        console.log('✅ Created new file metadata:', newFile.name, newFile.id);

        // Add file to state and save metadata to localStorage
        setFiles((prev: SavedFile[]) => {
          const updated = [...prev, newFile];
          console.log('📂 Updated files array, total count:', updated.length);

          // Save only metadata to localStorage (much smaller)
          saveToStorage(updated);
          return updated;
        });

        setUploadProgress(100);
        toast.success(`"${file.name}" uploaded successfully!`);

        // Check if the file needs AI naming
        checkForAutoNaming(newFile);

        // Reset upload state after a short delay
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 1000);

      } catch (error) {
        console.error('❌ File processing error:', error);
        toast.error(`Failed to process "${file.name}"`);
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  }, [getFileCategory, selectedProjectId, saveToStorage]);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  // Clipboard paste functionality
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files.length) {
        const files = Array.from(e.clipboardData.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
          e.preventDefault();
          const fileList = new DataTransfer();
          imageFiles.forEach(file => fileList.items.add(file));
          handleFileUpload(fileList.files);
          toast.success(`Pasted ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} from clipboard!`);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // The paste event will handle the actual pasting
        return;
      }
    };

    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleFileUpload]);

  // Download file
  const downloadFile = useCallback(async (file: SavedFile) => {
    try {
      if (!file.hasBlob) {
        toast.error('File data not available');
        return;
      }

      const blob = await getFileBlob(file.id);
      if (!blob) {
        toast.error('File not found in storage');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded "${file.name}"`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  }, []);

  // Delete file
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      // Find the file to revoke its object URL
      const fileToDelete = files.find(f => f.id === fileId);
      if (fileToDelete?.preview) {
        URL.revokeObjectURL(fileToDelete.preview);
        console.log('🗑️ Revoked object URL for deleted file:', fileToDelete.name);
      }

      // Delete from IndexedDB
      await deleteFileBlob(fileId);
      console.log('✅ Deleted blob from IndexedDB:', fileId);

      // Remove from state and localStorage
      setFiles((prev: SavedFile[]) => {
        const updated = prev.filter((f: SavedFile) => f.id !== fileId);
        saveToStorage(updated);
        return updated;
      });

      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }

      toast.success('File deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    }
  }, [files, selectedFile, saveToStorage]);

  // Copy file data to clipboard
  const copyFileData = useCallback(async (file: SavedFile) => {
    try {
      if (!file.hasBlob) {
        toast.error('File data not available');
        return;
      }

      const blob = await getFileBlob(file.id);
      if (!blob) {
        toast.error('File not found in storage');
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);

      toast.success('File copied to clipboard');
    } catch (error) {
      console.error('Copy error:', error);
      toast.error('Failed to copy file');
    }
  }, []);

  // Start renaming a file
  const startRename = useCallback((file: SavedFile) => {
    setRenamingFileId(file.id);
    setRenameValue(file.name);
  }, []);

  // Cancel renaming
  const cancelRename = useCallback(() => {
    setRenamingFileId(null);
    setRenameValue('');
  }, []);

  // Save the renamed file
  const saveRename = useCallback(async (fileId: string) => {
    if (!renameValue.trim()) {
      toast.error('Please enter a valid name');
      return;
    }

    try {
      setFiles((prev: SavedFile[]) => {
        const updated = prev.map((f: SavedFile) =>
          f.id === fileId
            ? { ...f, name: renameValue.trim() }
            : f
        );
        saveToStorage(updated);
        return updated;
      });

      toast.success('File renamed successfully');
      setRenamingFileId(null);
      setRenameValue('');
    } catch (error) {
      console.error('Rename error:', error);
      toast.error('Failed to rename file');
    }
  }, [renameValue, saveToStorage]);

  // Check if a filename is generic and needs AI naming
  const isGenericFileName = useCallback((fileName: string): boolean => {
    const name = fileName.toLowerCase();
    // More robust patterns to catch generic names, including timestamps
    const genericPatterns = [
      /^(image|img|photo|picture|screenshot)[\d_.-]*\.(jpg|jpeg|png|gif|webp)$/,
      /^(document|doc)[\d_.-]*\.(pdf|doc|docx|txt)$/,
      /^(file|untitled|new|upload|attachment)[\d_.-]*\./,
      /^\d{4}[-_]\d{2}[-_]\d{2}/, // Matches YYYY-MM-DD at the start
      /^file_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}\./, // Matches file_YYYY_MM_DD_HH_MM.
      /image\.png/
    ];

    return genericPatterns.some(pattern => pattern.test(name));
  }, []);

  // Generate AI-powered name suggestions for images
  const generateAiImageName = useCallback(async (file: SavedFile): Promise<string | null> => {
    try {
      if (!file.hasBlob || getFileCategory(file.type).name !== 'Images') {
        return null;
      }

      const blob = await getFileBlob(file.id);
      if (!blob) return null;

      // Convert blob to base64 for vision API
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];

            const response = await fetch('/api/vision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'grok-2-vision-latest', // Explicitly use a vision model
                imageUrl: `data:image/webp;base64,${base64}`,
                prompt: 'Analyze this image and suggest a descriptive, concise filename (without extension) that captures the main subject or content. Be specific but keep it under 50 characters. Only return the suggested filename, nothing else.'
              })
            });

            if (!response.ok) throw new Error('Vision API failed');

            const data = await response.json();
            const suggestion = data.choices[0].message.content.trim();

            if (suggestion && suggestion.length > 0 && suggestion.length < 100) {
              // Clean the suggestion and add appropriate extension
              const cleanName = suggestion
                .replace(/[^a-zA-Z0-9\s\-_]/g, '')
                .replace(/\s+/g, '_')
                .substring(0, 50);

              const extension = file.name.split('.').pop() || 'png';
              resolve(`${cleanName}.${extension}`);
            } else {
              resolve(null);
            }
          } catch (error) {
            console.error('AI naming error:', error);
            resolve(null);
          }
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('AI naming error:', error);
      return null;
    }
  }, [getFileCategory]);

  // Generate smart names for non-image files
  const generateSmartFileName = useCallback((file: SavedFile): string => {
    const category = getFileCategory(file.type);
    const extension = file.name.split('.').pop() || 'file';
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:\-T]/g, '_');

    const nameTemplates = {
      'Documents': `document_${timestamp}.${extension}`,
      'Videos': `video_${timestamp}.${extension}`,
      'Audio': `audio_${timestamp}.${extension}`,
      'Archives': `archive_${timestamp}.${extension}`,
      'Other': `file_${timestamp}.${extension}`
    };

    return nameTemplates[category.name as keyof typeof nameTemplates] || `file_${timestamp}.${extension}`;
  }, [getFileCategory]);

  // Suggest AI-powered names for files
  const suggestAiName = useCallback(async (file: SavedFile) => {
    if (aiNamingFiles.has(file.id)) return;

    setAiNamingFiles(prev => new Set(prev).add(file.id));

    try {
      let suggestion: string | null = null;

      if (getFileCategory(file.type).name === 'Images') {
        suggestion = await generateAiImageName(file);
      }

      if (!suggestion) {
        suggestion = generateSmartFileName(file);
      }

      if (suggestion && suggestion !== file.name) {
        setShowAiSuggestion({ fileId: file.id, suggestion });
      } else {
        toast.info('No better name suggestion available');
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast.error('Failed to generate name suggestion');
    } finally {
      setAiNamingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  }, [aiNamingFiles, getFileCategory, generateAiImageName, generateSmartFileName]);

  // Apply AI suggestion
  const applyAiSuggestion = useCallback(async () => {
    if (!showAiSuggestion) return;

    try {
      let newProjectId = '';
      const suggestedName = showAiSuggestion.suggestion.split('.')[0].replace(/_/g, ' ');
      const similarProject = projects.find(p => p.name.toLowerCase() === suggestedName.toLowerCase());

      if (similarProject) {
        newProjectId = similarProject.id;
      } else {
        const newProject: Project = {
          id: `project-${Date.now()}`,
          name: suggestedName,
          color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length].value,
          createdAt: new Date().toISOString(),
          fileCount: 1
        };
        setProjects((prev: Project[]) => {
          const updated = [...prev, newProject];
          saveProjectsToStorage(updated);
          return updated;
        });
        newProjectId = newProject.id;
      }

      setFiles((prev: SavedFile[]) => {
        const updated = prev.map((f: SavedFile) =>
          f.id === showAiSuggestion.fileId
            ? { ...f, name: showAiSuggestion.suggestion, projectId: newProjectId }
            : f
        );
        saveToStorage(updated);
        return updated;
      });

      toast.success('AI-suggested name applied!');
      setShowAiSuggestion(null);
    } catch (error) {
      console.error('Apply suggestion error:', error);
      toast.error('Failed to apply suggestion');
    }
  }, [showAiSuggestion, saveToStorage, projects, saveProjectsToStorage]);

  // Toggle favorite status of a file
  const toggleFavorite = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    const willBeFavorite = !file?.favorite;
    
    setFiles((prev: SavedFile[]) => {
      const updated = prev.map((f: SavedFile) =>
        f.id === fileId ? { ...f, favorite: willBeFavorite } : f
      );
      saveToStorage(updated);
      return updated;
    });

    toast.success(willBeFavorite ? 'Added to favorites' : 'Removed from favorites');
  }, [files, saveToStorage]);

  // Start editing description
  const startEditDescription = useCallback((file: SavedFile) => {
    setEditingDescriptionId(file.id);
    setDescriptionValue(file.description || '');
  }, []);

  // Save description
  const saveDescription = useCallback((fileId: string) => {
    setFiles((prev: SavedFile[]) => {
      const updated = prev.map((f: SavedFile) =>
        f.id === fileId ? { ...f, description: descriptionValue.trim() || undefined } : f
      );
      saveToStorage(updated);
      return updated;
    });
    setEditingDescriptionId(null);
    setDescriptionValue('');
    toast.success('Description updated');
  }, [descriptionValue, saveToStorage]);

  // Cancel description editing
  const cancelEditDescription = useCallback(() => {
    setEditingDescriptionId(null);
    setDescriptionValue('');
  }, []);

  // Auto-suggest names for generic files on upload
  const checkForAutoNaming = useCallback(async (file: SavedFile) => {
    // No need to check for generic name, just try to name all images
    if (getFileCategory(file.type).name === 'Images') {
      // Small delay to allow file to be properly stored
      setTimeout(() => {
        suggestAiName(file);
      }, 1000);
    }
  }, [getFileCategory, suggestAiName]);

  // Filter and sort files
  const filteredAndSortedFiles = files
    .filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || 
                             (selectedCategory === 'favorites' ? file.favorite : file.category === selectedCategory);
      const matchesProject = filterProject === 'all' || file.projectId === filterProject;
      return matchesSearch && matchesCategory && matchesProject;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'date':
        default:
          comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="w-full p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Files Manager</h1>
        <p className="text-muted-foreground">
          Upload, organize, and manage your files - Images, documents, and more stored securely in your browser
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            ref={dropZoneRef}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Upload Files</h3>
            <p className="text-muted-foreground mb-6">
              Drag and drop files here, or click anywhere to browse
            </p>

            {/* Project Selection - Outside clickable area */}
            <div
              className="bg-muted/30 rounded-lg p-4 mb-4 border border-border/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProjectModal(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0 h-7 px-3"
                >
                  <FolderPlus className="w-3 h-3 mr-1" />
                  New Project
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Maximum file size: 10MB • Press Ctrl+V to paste from clipboard
            </p>

            {isUploading && (
              <div className="mt-4">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round(uploadProgress)}% uploaded
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
            accept="image/*,application/pdf,text/*,video/*,audio/*,.zip,.rar"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File Categories Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors ${
                  selectedCategory === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <File className="w-4 h-4" />
                  All Files
                </span>
                <Badge variant="secondary" className="text-xs">
                  {files.length}
                </Badge>
              </button>

              <button
                onClick={() => setSelectedCategory('favorites')}
                className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors ${
                  selectedCategory === 'favorites' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Favorites
                </span>
                <Badge variant="secondary" className="text-xs">
                  {files.filter(f => f.favorite).length}
                </Badge>
              </button>

              {FILE_CATEGORIES.slice(0, -1).map((category) => {
                const count = files.filter(f => f.category === category.name).length;
                return (
                  <button
                    key={category.name}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors ${
                      selectedCategory === category.name ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {category.icon}
                      {category.name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Projects Section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => setFilterProject('all')}
                className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors ${
                  filterProject === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  All Projects
                </span>
                <Badge variant="secondary" className="text-xs">
                  {files.length}
                </Badge>
              </button>

              {projects.map((project) => {
                const count = files.filter(f => f.projectId === project.id).length;
                return (
                  <button
                    key={project.id}
                    onClick={() => setFilterProject(project.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors ${
                      filterProject === project.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main Files Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size' | 'type')}
                    className="px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                    <option value="type">Type</option>
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="h-8 w-8 p-0"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="h-8 w-8 p-0"
                  >
                    {viewMode === 'grid' ? <List className="w-3 h-3" /> : <Grid3X3 className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Files Display */}
          <Card>
            <CardContent className="p-4">
              {filteredAndSortedFiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No files found</p>
                  <p className="text-sm">
                    {files.length === 0
                      ? 'Upload your first file to get started!'
                      : 'Try adjusting your search or category filter.'
                    }
                  </p>
                </div>
              ) : (
                <div className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                    : 'space-y-2'
                }>
                  {filteredAndSortedFiles.map((file) => {
                    const category = getFileCategory(file.type);

                    if (viewMode === 'grid') {
                      return (
                        <Card
                          key={file.id}
                          className="cursor-pointer transition-all hover:shadow-md hover:scale-105 group"
                          onClick={() => {
                            addToRecentFiles(file);
                            setSelectedFile(file);
                          }}
                          data-file-id={file.id}
                        >
                          <CardContent className="p-3 relative">
                            {/* Action buttons overlay */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRename(file);
                                }}
                                title="Rename file"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  suggestAiName(file);
                                }}
                                disabled={aiNamingFiles.has(file.id)}
                                title="AI smart naming"
                              >
                                {aiNamingFiles.has(file.id) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Wand2 className="w-3 h-3" />
                                )}
                              </Button>
                            </div>

                            <div className="aspect-square mb-3 rounded-lg flex items-center justify-center overflow-hidden">
                              {file.preview && category.name === 'Images' ? (
                                <img
                                  src={file.preview}
                                  alt={file.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    // Hide broken image and show fallback icon
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.parentElement?.querySelector('.fallback-icon');
                                    if (fallback) {
                                      (fallback as HTMLElement).style.display = 'block';
                                    }
                                  }}
                                />
                              ) : file.preview && category.name === 'Videos' ? (
                                <video
                                  src={file.preview}
                                  className="w-full h-full object-contain cursor-pointer"
                                  muted
                                  playsInline
                                  loop
                                  preload="metadata"
                                  onMouseEnter={(e) => {
                                    const video = e.target as HTMLVideoElement;
                                    video.play().catch(console.error);
                                  }}
                                  onMouseLeave={(e) => {
                                    const video = e.target as HTMLVideoElement;
                                    video.pause();
                                    video.currentTime = 0;
                                  }}
                                  onError={(e) => {
                                    console.error('Video preview error:', e);
                                    const target = e.target as HTMLVideoElement;
                                    target.style.display = 'none';
                                    const fallback = target.parentElement?.querySelector('.fallback-icon');
                                    if (fallback) {
                                      (fallback as HTMLElement).style.display = 'block';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                                  <div className="text-muted-foreground" style={{ color: category.color }}>
                                    {category.icon}
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* File name with inline editing */}
                            {renamingFileId === file.id ? (
                              <div className="mb-1" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  className="h-6 text-xs p-1"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveRename(file.id);
                                    } else if (e.key === 'Escape') {
                                      cancelRename();
                                    }
                                  }}
                                  onBlur={() => saveRename(file.id)}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <h4 className="font-medium text-sm truncate mb-1">{file.name}</h4>
                            )}

                            {/* Project badge */}
                            {file.projectId && getProject(file.projectId) && (
                              <div className="mb-2">
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                  style={{
                                    backgroundColor: getProject(file.projectId)!.color.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                                    color: getProject(file.projectId)!.color,
                                    border: `1px solid ${getProject(file.projectId)!.color.replace('rgb(', 'rgba(').replace(')', ', 0.2)')}`
                                  }}
                                >
                                  {getProject(file.projectId)!.name}
                                </Badge>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{formatFileSize(file.size)}</span>
                              <Badge
                                variant="secondary"
                                className="text-xs"
                                style={{
                                  backgroundColor: `${category.color}20`,
                                  color: category.color,
                                  border: `1px solid ${category.color}40`
                                }}
                              >
                                {category.name}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    } else {
                      return (
                        <Card
                          key={file.id}
                          className="cursor-pointer transition-colors hover:bg-muted/50 group"
                          onClick={() => {
                            addToRecentFiles(file);
                            setSelectedFile(file);
                          }}
                          data-file-id={file.id}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${category.color}20` }}
                              >
                                <div style={{ color: category.color }}>
                                  {category.icon}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {/* File name with inline editing */}
                                  {renamingFileId === file.id ? (
                                    <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                                      <Input
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        className="h-6 text-xs p-1"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            saveRename(file.id);
                                          } else if (e.key === 'Escape') {
                                            cancelRename();
                                          }
                                        }}
                                        onBlur={() => saveRename(file.id)}
                                        autoFocus
                                      />
                                    </div>
                                  ) : (
                                    <h4 className="font-medium text-sm truncate">{file.name}</h4>
                                  )}
                                  {file.projectId && getProject(file.projectId) && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs flex-shrink-0"
                                      style={{
                                        backgroundColor: getProject(file.projectId)!.color.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                                        color: getProject(file.projectId)!.color,
                                        border: `1px solid ${getProject(file.projectId)!.color.replace('rgb(', 'rgba(').replace(')', ', 0.2)')}`
                                      }}
                                    >
                                      {getProject(file.projectId)!.name}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(file.size)} • {new Date(file.lastModified).toLocaleDateString()}
                                </p>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startRename(file);
                                  }}
                                  title="Rename file"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    suggestAiName(file);
                                  }}
                                  disabled={aiNamingFiles.has(file.id)}
                                  title="AI smart naming"
                                >
                                  {aiNamingFiles.has(file.id) ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Wand2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>

                              <Badge
                                variant="secondary"
                                className="text-xs"
                                style={{
                                  backgroundColor: `${category.color}20`,
                                  color: category.color,
                                  border: `1px solid ${category.color}40`
                                }}
                              >
                                {category.name}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* File Preview Modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedFile(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSelectedFile(null);
            }
          }}
          tabIndex={-1}
          style={{ outline: 'none' }}
        >
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg truncate flex-1 mr-4">{selectedFile.name}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              {/* File Preview */}
              <div className="max-h-96 overflow-hidden rounded-lg flex items-center justify-center">
                {(() => {
                  // Get the current file from files array to ensure we have the latest preview URL
                  const currentFile = files.find(f => f.id === selectedFile.id);
                  const category = getFileCategory(selectedFile.type);
                  const hasPreview = currentFile?.preview && (category.name === 'Images' || category.name === 'Videos');
                  
                  if (hasPreview && category.name === 'Images') {
                    return (
                      <>
                        <img
                          src={currentFile.preview}
                          alt={selectedFile.name}
                          className="max-w-full max-h-96 object-contain"
                          onError={(e) => {
                            // Hide broken image and show fallback
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.parentElement?.querySelector('.modal-fallback');
                            if (fallback) {
                              (fallback as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                        <div className="modal-fallback text-center text-muted-foreground h-48 items-center justify-center" style={{ display: 'none' }}>
                          <div>
                            {category.icon}
                            <p className="mt-2 text-sm">Image preview unavailable</p>
                          </div>
                        </div>
                      </>
                    );
                  } else if (hasPreview && category.name === 'Videos') {
                    return (
                      <video
                        src={currentFile.preview}
                        className="max-w-full max-h-96 object-contain"
                        autoPlay
                        muted
                        playsInline
                        onLoadedData={(e) => {
                          const video = e.target as HTMLVideoElement;
                          // Play once and stop
                          video.play().catch(console.error);
                          video.onended = () => {
                            video.currentTime = 0;
                            video.pause();
                          };
                        }}
                        onError={(e) => {
                          console.error('Video preview error:', e);
                          const target = e.target as HTMLVideoElement;
                          target.style.display = 'none';
                          const fallback = target.parentElement?.querySelector('.modal-fallback');
                          if (fallback) {
                            (fallback as HTMLElement).style.display = 'flex';
                          }
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    );
                  } else {
                    return (
                      <div className="h-48 rounded-lg bg-muted flex items-center justify-center w-full">
                        <div className="text-center text-muted-foreground">
                          {category.icon}
                          <p className="mt-2 text-sm">Preview not available</p>
                        </div>
                      </div>
                    );
                  }
                })()}
                {/* Hidden fallback for video errors */}
                <div className="modal-fallback text-center text-muted-foreground h-48 items-center justify-center" style={{ display: 'none' }}>
                  <div>
                    <Video className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Video preview unavailable</p>
                  </div>
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-muted-foreground text-sm">Description</p>
                                  {editingDescriptionId === selectedFile.id ? (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => saveDescription(selectedFile.id)}
                      className="h-6 px-2"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditDescription}
                      className="h-6 px-2"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditDescription(selectedFile)}
                      className="h-6 px-2"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    {selectedFile.description && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedFile.description || '');
                          toast.success('Description copied to clipboard');
                        }}
                        className="h-6 px-2"
                        title="Copy description"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
                </div>
                {editingDescriptionId === selectedFile.id ? (
                  <textarea
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    placeholder="Add a description or prompt for this file..."
                    className="w-full p-2 text-sm border border-border rounded resize-none bg-background"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        saveDescription(selectedFile.id);
                      } else if (e.key === 'Escape') {
                        cancelEditDescription();
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <div className="min-h-[60px] p-2 text-sm bg-muted/30 rounded border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors"
                       onClick={() => startEditDescription(selectedFile)}>
                    {selectedFile.description ? (
                      <p className="whitespace-pre-wrap">{selectedFile.description}</p>
                    ) : (
                      <p className="text-muted-foreground italic">Click to add description or prompt...</p>
                    )}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Size</p>
                  <p>{formatFileSize(selectedFile.size)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Type</p>
                  <p>{selectedFile.type || 'Unknown'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Category</p>
                  <p>{selectedFile.category}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Modified</p>
                  <p>{new Date(selectedFile.lastModified).toLocaleString()}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                {/* Primary Actions */}
                <div className="flex gap-2">
                <Button onClick={() => downloadFile(selectedFile)} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => {
                      // Navigate to chat with this file
                      const fileUrl = selectedFile.preview;
                      if (fileUrl) {
                        // Store file temporarily for chat use
                        sessionStorage.setItem('chatFileUrl', fileUrl);
                        sessionStorage.setItem('chatFileName', selectedFile.name);
                        sessionStorage.setItem('chatFileDescription', selectedFile.description || '');
                        
                        // Close modal first
                        setSelectedFile(null);
                        
                        // Navigate to chat tab
                        if (typeof window !== 'undefined') {
                          // Set the active tab to chat in localStorage
                          localStorage.setItem('grok-showcase-active-tab', 'chat');
                          // Reload the page to switch to chat
                          window.location.reload();
                        }
                        
                        toast.success('File sent to chat!');
                      } else {
                        toast.error('File preview not available for chat');
                      }
                  }}
                  variant="outline"
                    className="flex-1"
                    disabled={!selectedFile.preview}
                >
                    <Brain className="w-4 h-4 mr-2" />
                  Use in Chat
                </Button>
                </div>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => toggleFavorite(selectedFile.id)}
                    variant="outline"
                    className={(() => {
                      const currentFile = files.find(f => f.id === selectedFile.id);
                      return currentFile?.favorite ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500';
                    })()}
                    title={(() => {
                      const currentFile = files.find(f => f.id === selectedFile.id);
                      return currentFile?.favorite ? 'Remove from favorites' : 'Add to favorites';
                    })()}
                  >
                    <Heart className={(() => {
                      const currentFile = files.find(f => f.id === selectedFile.id);
                      return `w-4 h-4 mr-2 ${currentFile?.favorite ? 'fill-current' : ''}`;
                    })()} />
                    {(() => {
                      const currentFile = files.find(f => f.id === selectedFile.id);
                      return currentFile?.favorite ? 'Favorited' : 'Favorite';
                    })()}
                  </Button>
                <Button
                  onClick={() => {
                    startRename(selectedFile);
                    setSelectedFile(null);
                  }}
                  variant="outline"
                >
                    <Edit3 className="w-4 h-4 mr-2" />
                  Rename
                </Button>
                <Button
                  onClick={() => {
                    suggestAiName(selectedFile);
                    setSelectedFile(null);
                  }}
                  variant="outline"
                  disabled={aiNamingFiles.has(selectedFile.id)}
                >
                  {aiNamingFiles.has(selectedFile.id) ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  {aiNamingFiles.has(selectedFile.id) ? 'AI Naming...' : 'AI Name'}
                </Button>
                <Button onClick={() => copyFileData(selectedFile)} variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                  Copy Data
                </Button>
                </div>

                {/* Destructive Action */}
                <Button
                  onClick={() => {
                    deleteFile(selectedFile.id);
                    setSelectedFile(null);
                  }}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete File
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Creation Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5" />
                Create New Project
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Project Name</label>
                <Input
                  placeholder="Enter project name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createProject()}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Project Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setNewProjectColor(color)}
                      className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${
                        newProjectColor.name === color.name ? 'ring-2 ring-offset-2 ring-primary' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {newProjectColor.name}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button onClick={createProject} className="flex-1">
                  <Palette className="w-4 h-4 mr-1" />
                  Create Project
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProjectModal(false);
                    setNewProjectName('');
                    setNewProjectColor(PROJECT_COLORS[0]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Suggestion Modal */}
      {showAiSuggestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Smart Naming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  AI suggests a better name for your file:
                </p>
                <div className="bg-muted/50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">AI Suggestion</span>
                  </div>
                  <p className="font-medium text-foreground">{showAiSuggestion.suggestion}</p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-sm text-muted-foreground mb-1">Current name:</div>
                <p className="text-sm">{files.find(f => f.id === showAiSuggestion.fileId)?.name}</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button onClick={applyAiSuggestion} className="flex-1">
                  <Check className="w-4 h-4 mr-1" />
                  Apply Suggestion
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAiSuggestion(null)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
