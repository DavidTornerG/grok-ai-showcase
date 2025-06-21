'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Save,
  Download,
  Upload,
  Trash2,
  Copy,
  FileText,
  Search,
  Plus,
  Edit3,
  BookOpen,
  Archive,
  FolderPlus,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Hash,
  Palette,
  Sparkles,
  Undo2,
  Zap
} from 'lucide-react';

interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  projectId: string;
  tags: string[];
  lastModified: string;
  charCount: number;
  wordCount: number;
}

interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  promptCount: number;
}

const STORAGE_KEY = 'grok-prompt-library';
const PROJECTS_STORAGE_KEY = 'grok-prompt-projects';
const TEMP_CONTENT_KEY = 'grok-prompt-temp-content';
const TEMP_TITLE_KEY = 'grok-prompt-temp-title';
const TEMP_PROJECT_KEY = 'grok-prompt-temp-project';

// Notion-style project colors
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

export default function PromptLibrary() {
  const [currentContent, setCurrentContent] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'project'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [originalPrompt, setOriginalPrompt] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved prompts and projects from localStorage
  useEffect(() => {
    try {
      // Load prompts
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSavedPrompts(JSON.parse(saved));
      }

      // Load projects
      const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
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
          description: 'Default project for prompts',
          createdAt: new Date().toISOString(),
          promptCount: 0
        };
        setProjects([defaultProject]);
        setSelectedProjectId(defaultProject.id);
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([defaultProject]));
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  }, []);

  // Load temp content on mount
  useEffect(() => {
    try {
      const tempContent = localStorage.getItem(TEMP_CONTENT_KEY);
      const tempTitle = localStorage.getItem(TEMP_TITLE_KEY);
      const tempProject = localStorage.getItem(TEMP_PROJECT_KEY);

      if (!selectedPrompt) {
        if (tempContent) setCurrentContent(tempContent);
        if (tempTitle) setCurrentTitle(tempTitle);
        if (tempProject && projects.find(p => p.id === tempProject)) {
          setSelectedProjectId(tempProject);
        }
      }
    } catch (error) {
      console.error('Failed to load temp content:', error);
    }
  }, [projects, selectedPrompt]);

  // Auto-save current content, title, and project
  useEffect(() => {
    const autoSave = setTimeout(() => {
      if (!selectedPrompt) {
        try {
          localStorage.setItem(TEMP_CONTENT_KEY, currentContent);
          localStorage.setItem(TEMP_TITLE_KEY, currentTitle);
          localStorage.setItem(TEMP_PROJECT_KEY, selectedProjectId);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 1000);

    return () => clearTimeout(autoSave);
  }, [currentContent, currentTitle, selectedProjectId, selectedPrompt]);

  // Save prompts to localStorage
  const saveToStorage = useCallback((prompts: SavedPrompt[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    } catch (error) {
      console.error('Failed to save prompts:', error);
      toast.error('Failed to save prompts to storage');
    }
  }, []);

  // Save projects to localStorage
  const saveProjectsToStorage = useCallback((projects: Project[]) => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
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
      promptCount: 0
    };

    setProjects(prev => {
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

  // Update project prompt count
  const updateProjectPromptCount = useCallback((projectId: string, count: number) => {
    setProjects(prev => {
      const updated = prev.map(p =>
        p.id === projectId ? { ...p, promptCount: count } : p
      );
      saveProjectsToStorage(updated);
      return updated;
    });
  }, [saveProjectsToStorage]);

  // Get project by ID
  const getProject = useCallback((projectId: string) => {
    return projects.find(p => p.id === projectId);
  }, [projects]);

  // Calculate character and word count
  useEffect(() => {
    const chars = currentContent.length;
    const words = currentContent.trim() === '' ? 0 :
      currentContent.trim().split(/\s+/).length;

    setCharCount(chars);
    setWordCount(words);
  }, [currentContent]);

  // Auto-save current content, title, and project
  useEffect(() => {
    const autoSave = setTimeout(() => {
      if (!selectedPrompt) {
        try {
          localStorage.setItem(TEMP_CONTENT_KEY, currentContent);
          localStorage.setItem(TEMP_TITLE_KEY, currentTitle);
          localStorage.setItem(TEMP_PROJECT_KEY, selectedProjectId);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 1000);

    return () => clearTimeout(autoSave);
  }, [currentContent, currentTitle, selectedProjectId, selectedPrompt]);

  // Load temp content on mount
  useEffect(() => {
    try {
      const tempContent = localStorage.getItem(TEMP_CONTENT_KEY);
      const tempTitle = localStorage.getItem(TEMP_TITLE_KEY);
      const tempProject = localStorage.getItem(TEMP_PROJECT_KEY);

      if (!selectedPrompt) {
        if (tempContent) setCurrentContent(tempContent);
        if (tempTitle) setCurrentTitle(tempTitle);
        if (tempProject && projects.find(p => p.id === tempProject)) {
          setSelectedProjectId(tempProject);
        }
      }
    } catch (error) {
      console.error('Failed to load temp content:', error);
    }
  }, [projects, selectedPrompt]);

  const saveCurrentPrompt = useCallback(() => {
    if (!currentContent.trim()) {
      toast.warning('Please enter some content before saving');
      return;
    }

    if (!selectedProjectId) {
      toast.warning('Please select a project');
      return;
    }

    const title = currentTitle.trim() || `Prompt ${new Date().toLocaleDateString()}`;
    const prompt: SavedPrompt = {
      id: selectedPrompt || `prompt-${Date.now()}`,
      title,
      content: currentContent,
      projectId: selectedProjectId,
      tags: [],
      lastModified: new Date().toISOString(),
      charCount,
      wordCount
    };

    setSavedPrompts(prev => {
      const filtered = prev.filter(p => p.id !== prompt.id);
      const updated = [...filtered, prompt];
      saveToStorage(updated);

      // Update project prompt count
      const projectPromptCount = updated.filter(p => p.projectId === selectedProjectId).length;
      updateProjectPromptCount(selectedProjectId, projectPromptCount);

      return updated;
    });

    setSelectedPrompt(prompt.id);
    setIsEditing(false);
    setOriginalPrompt(''); // Clear original prompt after saving

    // Clear temporary storage after successful save
    try {
      localStorage.removeItem(TEMP_CONTENT_KEY);
      localStorage.removeItem(TEMP_TITLE_KEY);
      localStorage.removeItem(TEMP_PROJECT_KEY);
    } catch (error) {
      console.error('Failed to clear temp storage:', error);
    }

    toast.success(`Prompt "${title}" saved successfully!`);
  }, [currentContent, currentTitle, charCount, wordCount, selectedPrompt, selectedProjectId, saveToStorage, updateProjectPromptCount]);

  const loadPrompt = useCallback((prompt: SavedPrompt) => {
    setCurrentContent(prompt.content);
    setCurrentTitle(prompt.title);
    setSelectedPrompt(prompt.id);
    setSelectedProjectId(prompt.projectId);
    setIsEditing(false);
    setOriginalPrompt(''); // Clear original prompt when loading a different prompt
  }, []);

  const deletePrompt = useCallback((promptId: string) => {
    setSavedPrompts(prev => {
      const updated = prev.filter(p => p.id !== promptId);
      saveToStorage(updated);
      return updated;
    });

    if (selectedPrompt === promptId) {
      setSelectedPrompt(null);
      setCurrentContent('');
      setCurrentTitle('');
    }

    toast.success('Prompt deleted');
  }, [selectedPrompt, saveToStorage]);

  const createNewPrompt = useCallback(() => {
    setCurrentContent('');
    setCurrentTitle('');
    setSelectedPrompt(null);
    setIsEditing(true);
    setOriginalPrompt(''); // Clear original prompt when creating new

    // Clear temporary storage
    try {
      localStorage.removeItem(TEMP_CONTENT_KEY);
      localStorage.removeItem(TEMP_TITLE_KEY);
      localStorage.removeItem(TEMP_PROJECT_KEY);
    } catch (error) {
      console.error('Failed to clear temp storage:', error);
    }

    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!currentContent.trim()) {
      toast.warning('No content to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(currentContent);
      toast.success('Content copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  }, [currentContent]);

  const exportPrompts = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      prompts: savedPrompts
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-library-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Prompts exported successfully!');
  }, [savedPrompts]);

  const importPrompts = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.prompts && Array.isArray(data.prompts)) {
          setSavedPrompts(prev => {
            const updated = [...prev, ...data.prompts];
            saveToStorage(updated);
            return updated;
          });
          toast.success(`Imported ${data.prompts.length} prompts!`);
        } else {
          toast.error('Invalid file format');
        }
      } catch (error) {
        toast.error('Failed to import prompts');
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [saveToStorage]);

  // Optimize prompt using AI
  const optimizePrompt = useCallback(async () => {
    if (!currentContent.trim()) {
      toast.warning('Please enter some content to optimize');
      return;
    }

    setIsOptimizing(true);
    setOriginalPrompt(currentContent); // Store original for revert

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a prompt optimization expert. Take the user's prompt and make it more specific and actionable while preserving their original intent and context.

Guidelines:
- Keep it concise (under 100 words when possible)
- Add specific details that clarify what they want
- Preserve the original context and domain
- Don't assume a different application or use case
- Make it more actionable with clear success criteria
- Keep the user's tone and style

Return ONLY the improved prompt, nothing else.`
            },
            {
              role: 'user',
              content: `Please optimize this prompt:\n\n${currentContent}`
            }
          ],
          model: 'grok-3-mini-fast-latest',
          temperature: 0.3,
          maxTokens: 2000
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to optimize prompt');
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        setCurrentContent(data.choices[0].message.content);
        toast.success('✨ Prompt optimized successfully! Use "Revert" to restore original.');
      } else {
        throw new Error('No optimized content received');
      }
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Failed to optimize prompt. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  }, [currentContent]);

  // Revert to original prompt
  const revertToOriginal = useCallback(() => {
    if (originalPrompt) {
      setCurrentContent(originalPrompt);
      setOriginalPrompt('');
      toast.success('🔄 Reverted to original prompt');
    }
  }, [originalPrompt]);

  // Enhanced filtering and sorting
  const filteredAndSortedPrompts = savedPrompts
    .filter(prompt => {
      // Search filter
      const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.content.toLowerCase().includes(searchTerm.toLowerCase());

      // Project filter
      const matchesProject = filterProject === 'all' || prompt.projectId === filterProject;

      return matchesSearch && matchesProject;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'project':
          const projectA = getProject(a.projectId)?.name || '';
          const projectB = getProject(b.projectId)?.name || '';
          comparison = projectA.localeCompare(projectB);
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
        <h1 className="text-3xl font-bold mb-2">Prompt Library</h1>
        <p className="text-muted-foreground">
          Store, organize, and manage your AI prompts - All prompts are saved locally in your browser
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                {selectedPrompt ? 'Edit Prompt' : 'Create New Prompt'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button onClick={createNewPrompt} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
                <Button onClick={saveCurrentPrompt} size="sm">
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter prompt title..."
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
                className="font-medium"
              />

              {/* Project Selector */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    style={{ paddingRight: '32px' }}
                  >
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={() => setShowProjectModal(true)}
                  size="sm"
                  variant="outline"
                  className="mt-6"
                >
                  <FolderPlus className="w-4 h-4 mr-1" />
                  New Project
                </Button>
              </div>

              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Type your prompts here and when you come back all your prompts will be right here..."
                  value={currentContent}
                  onChange={(e) => setCurrentContent(e.target.value)}
                  className="min-h-[400px] resize-none font-mono text-sm leading-relaxed"
                  style={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))'
                  }}
                />

                {/* Character/Word Count */}
                <div className="absolute bottom-3 right-3">
                  <Badge variant="secondary" className="text-xs">
                    {charCount} character{charCount !== 1 ? 's' : ''}, {wordCount} word{wordCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button onClick={copyToClipboard} size="sm" variant="outline">
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>

                  <Button onClick={exportPrompts} size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-1" />
                    Export All
                  </Button>

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Import
                  </Button>

                  <Button
                    onClick={optimizePrompt}
                    size="sm"
                    variant="outline"
                    disabled={isOptimizing || !currentContent.trim()}
                    className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:from-purple-500/20 hover:to-blue-500/20"
                  >
                    {isOptimizing ? (
                      <>
                        <Zap className="w-4 h-4 mr-1 animate-pulse" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-1" />
                        Optimize
                      </>
                    )}
                  </Button>

                  {originalPrompt && (
                    <Button
                      onClick={revertToOriginal}
                      size="sm"
                      variant="outline"
                      className="border-orange-500/30 text-orange-700 dark:text-orange-300 hover:bg-orange-500/10"
                    >
                      <Undo2 className="w-4 h-4 mr-1" />
                      Revert
                    </Button>
                  )}
                </div>

                {selectedPrompt && (
                  <Button
                    onClick={() => deletePrompt(selectedPrompt)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Saved Prompts Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Saved Prompts ({savedPrompts.length})
              </CardTitle>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search prompts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters and Sorting */}
              <div className="space-y-3">
                {/* Project Filter */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Filter by Project</label>
                  <select
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    style={{ paddingRight: '32px' }}
                  >
                    <option value="all">All Projects</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({savedPrompts.filter(p => p.projectId === project.id).length})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Sort by</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'project')}
                      className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      style={{ paddingRight: '32px' }}
                    >
                      <option value="date">Date Modified</option>
                      <option value="title">Title</option>
                      <option value="project">Project</option>
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="mt-6 h-8 w-8 p-0"
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredAndSortedPrompts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {savedPrompts.length === 0
                      ? 'No saved prompts yet. Create your first prompt!'
                      : 'No prompts match your search.'
                    }
                  </p>
                </div>
              ) : (
                filteredAndSortedPrompts.map((prompt) => {
                  const project = getProject(prompt.projectId);
                  return (
                    <Card
                      key={prompt.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedPrompt === prompt.id ? 'ring-2 ring-primary ring-opacity-50 bg-muted/30' : ''
                      }`}
                      onClick={() => loadPrompt(prompt)}
                      data-prompt-id={prompt.id}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate flex-1">{prompt.title}</h4>
                              {project && (
                                <div
                                  className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
                                  style={{
                                    backgroundColor: project.color.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                                    color: project.color,
                                    border: `1px solid ${project.color.replace('rgb(', 'rgba(').replace(')', ', 0.2)')}`
                                  }}
                                >
                                  {project.name}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {prompt.content.substring(0, 100)}...
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {prompt.wordCount} words
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(prompt.lastModified).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden file input for importing */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={importPrompts}
        className="hidden"
      />

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
    </div>
  );
}
