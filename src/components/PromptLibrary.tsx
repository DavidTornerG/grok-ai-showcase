'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useClipboard, processClipboardImage } from '@/lib/useClipboard';
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
  Zap,
  Image as ImageIcon,
  X,
  Loader2,
  MousePointer2,
  Settings,
  Check
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
  images?: Array<{
    id: string;
    url: string;
    name: string;
  }>;
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
const ENHANCEMENT_SETTINGS_KEY = 'grok-prompt-enhancement-settings';
const LAST_SELECTED_PROMPT_ID_KEY = 'grok-prompt-last-selected-id';

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

// Prompt enhancement styles
const ENHANCEMENT_STYLES = [
  {
    id: 'concise',
    name: 'Concise & Clear',
    description: 'Makes prompts shorter and more direct while preserving meaning',
    icon: '✂️',
    systemPrompt: `You are a prompt optimization expert. Take the user's prompt and make it more concise and clear while preserving their original intent.

Guidelines:
- Remove unnecessary words and redundancy
- Use clear, direct language
- Keep it under 50 words when possible
- Maintain the original context and requirements
- Make it actionable with specific instructions

Return ONLY the improved prompt, nothing else.`
  },
  {
    id: 'detailed',
    name: 'Detailed & Specific',
    description: 'Adds context, examples, and specific requirements for better results',
    icon: '📋',
    systemPrompt: `You are a prompt optimization expert. Take the user's prompt and make it more detailed and specific while preserving their original intent.

Guidelines:
- Add relevant context and background information
- Include specific examples or formats when helpful
- Clarify ambiguous requirements
- Add success criteria or expected outcomes
- Maintain the user's tone and domain
- Expand on technical details when relevant

Return ONLY the improved prompt, nothing else.`
  },
  {
    id: 'creative',
    name: 'Creative & Engaging',
    description: 'Enhances prompts for more creative and engaging AI responses',
    icon: '🎨',
    systemPrompt: `You are a prompt optimization expert. Take the user's prompt and make it more creative and engaging while preserving their original intent.

Guidelines:
- Add creative elements and storytelling aspects
- Use engaging language and vivid descriptions
- Encourage innovative thinking and unique perspectives
- Include emotional context when appropriate
- Make it inspiring and thought-provoking
- Maintain the original purpose and domain

Return ONLY the improved prompt, nothing else.`
  },
  {
    id: 'professional',
    name: 'Professional & Formal',
    description: 'Refines prompts for business and professional contexts',
    icon: '💼',
    systemPrompt: `You are a prompt optimization expert. Take the user's prompt and make it more professional and formal while preserving their original intent.

Guidelines:
- Use professional, business-appropriate language
- Structure with clear objectives and deliverables
- Add relevant industry context and standards
- Include measurable outcomes and criteria
- Maintain formal tone and terminology
- Focus on practical, actionable results

Return ONLY the improved prompt, nothing else.`
  },
  {
    id: 'technical',
    name: 'Technical & Precise',
    description: 'Optimizes prompts for technical accuracy and implementation details',
    icon: '⚙️',
    systemPrompt: `You are a prompt optimization expert. Take the user's prompt and make it more technical and precise while preserving their original intent.

Guidelines:
- Add technical specifications and requirements
- Include relevant technical context and constraints
- Use precise, unambiguous language
- Specify formats, standards, and methodologies
- Add implementation details and considerations
- Focus on accuracy and technical completeness

Return ONLY the improved prompt, nothing else.`
  },
  {
    id: 'educational',
    name: 'Educational & Explanatory',
    description: 'Enhances prompts for learning and teaching purposes',
    icon: '🎓',
    systemPrompt: `You are a prompt optimization expert. Take the user's prompt and make it more educational and explanatory while preserving their original intent.

Guidelines:
- Structure for learning and understanding
- Add context and background information
- Include step-by-step breakdowns when helpful
- Encourage explanation of reasoning and methods
- Add learning objectives and outcomes
- Make it accessible and easy to follow

Return ONLY the improved prompt, nothing else.`
  }
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
  const [pastedImages, setPastedImages] = useState<Array<{id: string, url: string, name: string}>>([]);
  const [isProcessingPaste, setIsProcessingPaste] = useState(false);
  const [showEnhancementSettings, setShowEnhancementSettings] = useState(false);
  const [selectedEnhancementStyle, setSelectedEnhancementStyle] = useState(ENHANCEMENT_STYLES[0].id);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image paste from clipboard
  const handleImagePaste = useCallback(async (file: File) => {
    setIsProcessingPaste(true);
    try {
      const result = await processClipboardImage(file, 2 * 1024 * 1024, 800, 0.8);
      const imageId = Date.now().toString();
      
      // Convert blob to base64 for persistent storage
      const response = await fetch(result.url);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      setPastedImages(prev => [...prev, {
        id: imageId,
        url: base64, // Store as base64 instead of blob URL
        name: file.name || `pasted-image-${imageId}.jpg`
      }]);

      // Clean up the temporary blob URL
      URL.revokeObjectURL(result.url);
      
      toast.success(`Image pasted! ${Math.round(result.compressedSize / 1024)}KB`);
    } catch (error) {
      console.error('Failed to process pasted image:', error);
      toast.error('Failed to process pasted image');
    } finally {
      setIsProcessingPaste(false);
    }
  }, []);

  // Remove pasted image
  const removePastedImage = useCallback((imageId: string) => {
    setPastedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // No need to revoke URLs since we're using base64 now
      return updated;
    });
  }, []);

  // Copy individual image to clipboard
  const copyImageToClipboard = useCallback(async (imageId: string) => {
    const image = pastedImages.find(img => img.id === imageId);
    if (!image) return;

    try {
      // Convert base64 to blob
      const response = await fetch(image.url);
      const blob = await response.blob();
      
      if (navigator.clipboard && navigator.clipboard.write) {
        const clipboardItem = new ClipboardItem({
          [blob.type]: blob
        });
        
        await navigator.clipboard.write([clipboardItem]);
        toast.success(`Image "${image.name}" copied to clipboard!`);
      } else {
        // Fallback: create a temporary download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = image.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Image "${image.name}" downloaded (clipboard not supported)`);
      }
    } catch (error) {
      console.error('Failed to copy image:', error);
      toast.error('Failed to copy image to clipboard');
    }
  }, [pastedImages]);

  // Initialize clipboard functionality
  useClipboard({
    onImagePaste: handleImagePaste,
    enableImagePaste: true,
    enableTextPaste: false,
    enabled: true
  });

  // Load prompt function - moved before useEffect to avoid hoisting issues
  const loadPrompt = useCallback((prompt: SavedPrompt) => {
    setCurrentContent(prompt.content);
    setCurrentTitle(prompt.title);
    setSelectedPrompt(prompt.id);
    setSelectedProjectId(prompt.projectId);
    setIsEditing(false);
    setOriginalPrompt(''); // Clear original prompt when loading a different prompt
    setPastedImages(prompt.images || []);
    localStorage.setItem(LAST_SELECTED_PROMPT_ID_KEY, prompt.id);
  }, []);

  // Helper function to load temporary content
  const loadTempContent = useCallback(() => {
    try {
      const tempContent = localStorage.getItem(TEMP_CONTENT_KEY);
      const tempTitle = localStorage.getItem(TEMP_TITLE_KEY);
      const tempProject = localStorage.getItem(TEMP_PROJECT_KEY);

      if (tempContent) setCurrentContent(tempContent);
      if (tempTitle) setCurrentTitle(tempTitle);
      if (tempProject) { // Simplified check
        setSelectedProjectId(tempProject);
      }
    } catch (error) {
      console.error('Failed to load temp content:', error);
    }
  }, []); // Removed projects dependency as it's not needed here.

  // Load saved prompts and projects from localStorage
  useEffect(() => {
    try {
      // Load prompts
      const saved = localStorage.getItem(STORAGE_KEY);
      const allPrompts = saved ? JSON.parse(saved) : [];
      setSavedPrompts(allPrompts);

      // Load projects
      const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects);
        setProjects(parsedProjects);
        if (parsedProjects.length > 0 && !selectedProjectId) {
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

      // Load enhancement settings
      const savedEnhancementSettings = localStorage.getItem(ENHANCEMENT_SETTINGS_KEY);
      if (savedEnhancementSettings) {
        setSelectedEnhancementStyle(savedEnhancementSettings);
      }

      // Load last selected prompt or temporary content
      const lastSelectedId = localStorage.getItem(LAST_SELECTED_PROMPT_ID_KEY);
      if (lastSelectedId) {
        const lastPrompt = allPrompts.find((p: SavedPrompt) => p.id === lastSelectedId);
        if (lastPrompt) {
          loadPrompt(lastPrompt);
        } else {
          // If last selected prompt not found, clear the ID and load temp content
          localStorage.removeItem(LAST_SELECTED_PROMPT_ID_KEY);
          loadTempContent();
        }
      } else {
        loadTempContent();
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  }, [loadPrompt, loadTempContent]); // Correctly add dependencies

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
      wordCount,
      images: pastedImages.length > 0 ? [...pastedImages] : undefined
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
    // Keep pasted images after saving so they persist

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
      setPastedImages([]);
      localStorage.removeItem(LAST_SELECTED_PROMPT_ID_KEY);
    }

    toast.success('Prompt deleted');
  }, [selectedPrompt, saveToStorage]);

  const createNewPrompt = useCallback(() => {
    setCurrentContent('');
    setCurrentTitle('');
    setSelectedPrompt(null);
    setIsEditing(true);
    setOriginalPrompt(''); // Clear original prompt when creating new
    setPastedImages([]);
    localStorage.removeItem(LAST_SELECTED_PROMPT_ID_KEY);

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

  // Create downloadable file with prompt and images
  const downloadPromptWithImages = useCallback(() => {
    if (!currentContent.trim() && pastedImages.length === 0) {
      toast.warning('No content to download');
      return;
    }

    try {
      const currentTime = new Date().toLocaleString();
      const imageCount = pastedImages.length;
      
      // Create HTML content with AI instructions
      let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>AI Implementation Prompt with Visual References</title>
    <style>
                 body { 
             font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
             max-width: 900px; 
             margin: 0 auto; 
             padding: 20px; 
             line-height: 1.6;
             background-color: #0f0f23;
             color: #e1e1e6;
         }
                 .header {
             background: linear-gradient(135deg, #4c51bf 0%, #553c9a 100%);
             color: #f7fafc;
             padding: 20px;
             border-radius: 12px;
             margin-bottom: 30px;
             text-align: center;
             border: 1px solid #4a5568;
         }
         .ai-instructions {
             background: #1a202c;
             border-left: 4px solid #4299e1;
             padding: 20px;
             margin: 20px 0;
             border-radius: 8px;
             border: 1px solid #2d3748;
         }
         .ai-instructions h2 {
             color: #63b3ed;
             margin-top: 0;
         }
         .prompt-section {
             background: #1a202c;
             padding: 20px;
             border-radius: 8px;
             margin: 20px 0;
             border: 1px solid #2d3748;
         }
         .prompt-text { 
             background: #2d3748;
             padding: 20px;
             border-radius: 8px;
             margin: 15px 0;
             white-space: pre-wrap;
             border: 1px solid #4a5568;
             font-size: 16px;
             color: #e2e8f0;
         }
         .images-section {
             margin: 30px 0;
         }
         .image-container { 
             margin: 20px 0; 
             padding: 15px;
             background: #1a202c;
             border-radius: 8px;
             border: 1px solid #2d3748;
         }
         .image-container h3 {
             color: #63b3ed;
             margin-top: 0;
         }
         .image-container img { 
             max-width: 100%; 
             height: auto; 
             border: 2px solid #4a5568; 
             border-radius: 8px;
             box-shadow: 0 4px 12px rgba(0,0,0,0.3);
             background: #2d3748;
             display: block;
             margin: 10px auto;
         }
         .image-container img:not([src]), .image-container img[src=""] {
             display: none;
         }
         .image-error {
             background: #2d3748;
             border: 2px dashed #4a5568;
             border-radius: 8px;
             padding: 20px;
             text-align: center;
             color: #a0aec0;
             margin: 10px 0;
         }
         .image-name { 
             font-size: 14px; 
             color: #a0aec0; 
             margin-top: 10px; 
             font-weight: 500;
         }
         .metadata {
             background: #1a202c;
             padding: 15px;
             border-radius: 8px;
             margin: 20px 0;
             font-size: 14px;
             color: #a0aec0;
             border: 1px solid #2d3748;
         }
         .implementation-notes {
             background: #2d3748;
             border-left: 4px solid #ed8936;
             padding: 20px;
             margin: 20px 0;
             border-radius: 8px;
             border: 1px solid #4a5568;
         }
         .implementation-notes h3 {
             color: #fbb6ce;
             margin-top: 0;
         }
                 ul { padding-left: 20px; }
         li { margin: 8px 0; }
         h1, h2, h3 { color: #e2e8f0; }
         strong { color: #fbb6ce; }
         em { color: #a0aec0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 AI Implementation Prompt Package</h1>
        <p>Complete prompt with visual references for AI implementation</p>
    </div>

    <div class="ai-instructions">
        <h2>📋 Instructions for AI Assistant</h2>
        <p><strong>You are an AI assistant tasked with implementing the following request.</strong></p>
        
        <h3>📖 How to Use This Prompt Package:</h3>
        <ul>
            <li><strong>Read the main prompt</strong> in the "User Request" section below</li>
            <li><strong>Examine all reference images</strong> carefully - they provide crucial context and specifications</li>
            <li><strong>Use the images as visual references</strong> when implementing the request</li>
            <li><strong>Ask clarifying questions</strong> if any part of the request or images is unclear</li>
            <li><strong>Provide step-by-step implementation</strong> when applicable</li>
        </ul>

        <h3>🎯 Implementation Guidelines:</h3>
        <ul>
            <li>Follow the exact specifications shown in the reference images</li>
            <li>Maintain consistency with the visual style and layout demonstrated</li>
            <li>If implementing code, ensure it matches the patterns shown in screenshots</li>
            <li>If creating designs, replicate the visual elements and styling from the images</li>
            <li>Reference specific images by their names when explaining your implementation</li>
        </ul>
    </div>

    <div class="prompt-section">
        <h2>💬 User Request</h2>`;

      if (currentContent.trim()) {
        htmlContent += `<div class="prompt-text">${currentContent.replace(/\n/g, '<br>')}</div>`;
      } else {
        htmlContent += `<div class="prompt-text"><em>No text prompt provided - please refer to the visual references below.</em></div>`;
      }

      htmlContent += `</div>`;

      if (pastedImages.length > 0) {
        htmlContent += `
    <div class="images-section">
        <h2>🖼️ Visual References (${imageCount} image${imageCount > 1 ? 's' : ''})</h2>
        <p><strong>Important:</strong> These images contain crucial information for implementing the request. Analyze each image carefully and reference them in your implementation.</p>`;
        
                 pastedImages.forEach((img, index) => {
           htmlContent += `
         <div class="image-container">
             <h3>Image ${index + 1}: ${img.name}</h3>
             <img src="${img.url}" alt="${img.name}" 
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                  onload="this.style.display='block'; this.nextElementSibling.style.display='none';">
             <div class="image-error" style="display: none;">
                 ⚠️ Image could not be loaded<br>
                 <small>File: ${img.name} | Reference ID: Image-${index + 1}</small>
             </div>
             <div class="image-name">Reference ID: Image-${index + 1} | File: ${img.name}</div>
         </div>`;
         });
        
        htmlContent += `</div>`;
      }

      htmlContent += `
    <div class="implementation-notes">
        <h3>⚡ Implementation Notes</h3>
        <ul>
            <li><strong>Context:</strong> This prompt was created using the Grok AI Showcase prompt library</li>
            <li><strong>Images:</strong> All images are embedded as base64 data for portability</li>
            <li><strong>References:</strong> When implementing, refer to images by their "Image-X" identifiers</li>
            <li><strong>Quality:</strong> Images have been optimized for web viewing while maintaining detail</li>
            ${imageCount > 0 ? `<li><strong>Visual Specs:</strong> Use the ${imageCount} reference image${imageCount > 1 ? 's' : ''} as the primary source of truth for visual requirements</li>` : ''}
        </ul>
    </div>

    <div class="metadata">
        <strong>📊 Prompt Package Metadata:</strong><br>
        Generated: ${currentTime}<br>
        Text Content: ${currentContent.trim() ? `${currentContent.trim().length} characters, ${currentContent.trim().split(/\s+/).length} words` : 'None'}<br>
        Visual References: ${imageCount} image${imageCount > 1 ? 's' : ''}<br>
        Package Type: AI Implementation Prompt with Visual References
    </div>

         <div style="text-align: center; margin-top: 40px; padding: 20px; background: #1a202c; border-radius: 8px; border: 1px solid #2d3748;">
         <p style="margin: 0; color: #a0aec0; font-size: 14px;">
             📦 This prompt package was created with <strong style="color: #63b3ed;">Grok AI Showcase</strong><br>
             Ready for AI implementation • Includes embedded visual references • Portable HTML format
         </p>
     </div>
</body>
</html>`;

      // Create and download the file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-prompt-package-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('🌙 Dark mode AI prompt package downloaded! Perfect for sharing with AI assistants.');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to create downloadable file');
    }
  }, [currentContent, pastedImages]);

  const copyToClipboard = useCallback(async () => {
    if (!currentContent.trim() && pastedImages.length === 0) {
      toast.warning('No content to copy');
      return;
    }

    try {
      const textContent = currentContent.trim();
      
      // Strategy 1: Try to copy images with text as HTML (works in rich text editors)
      if (pastedImages.length > 0 && navigator.clipboard && navigator.clipboard.write) {
        try {
          // Create HTML content with embedded images
          let htmlContent = '';
          
          // Add text content first
          if (textContent) {
            htmlContent += `<div style="font-family: Arial, sans-serif; line-height: 1.4; margin-bottom: 10px;">${textContent.replace(/\n/g, '<br>')}</div>`;
          }
          
          // Add images (they're already base64)
          for (const img of pastedImages) {
            htmlContent += `<div style="margin: 10px 0;"><img src="${img.url}" alt="${img.name}" style="max-width: 500px; height: auto; border: 1px solid #ddd; border-radius: 4px;"></div>`;
          }

          // Create clipboard items with multiple formats
          const clipboardItems = [
            new ClipboardItem({
              'text/html': new Blob([htmlContent], { type: 'text/html' }),
              'text/plain': new Blob([textContent || 'Images attached'], { type: 'text/plain' })
            })
          ];

          await navigator.clipboard.write(clipboardItems);
          toast.success(`📋 Content with ${pastedImages.length} image(s) copied as rich content! Paste into VS Code, Word, or other rich text editors.`);
          return;
        } catch (richCopyError) {
          console.log('Rich HTML copy failed, trying individual image copy:', richCopyError);
        }
      }
      
      // Strategy 2: Copy just the first image for image-focused apps
      if (pastedImages.length > 0 && navigator.clipboard && navigator.clipboard.write) {
        try {
          const response = await fetch(pastedImages[0].url);
          const blob = await response.blob();
          
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob
            })
          ]);
          
          const additionalInfo = pastedImages.length > 1 ? ` (${pastedImages.length - 1} more images in prompt)` : '';
          toast.success(`🖼️ First image copied to clipboard${additionalInfo}! Use individual copy buttons for other images.`);
          return;
        } catch (imageCopyError) {
          console.log('Image copy failed:', imageCopyError);
        }
      }
      
      // Strategy 3: Copy text with image references as fallback
      if (pastedImages.length > 0) {
        const imageInfo = pastedImages.map((img, index) => `[Image ${index + 1}: ${img.name}]`).join('\n');
        const combinedText = textContent + (textContent && imageInfo ? '\n\n' : '') + imageInfo;
        
        await navigator.clipboard.writeText(combinedText);
        toast.success(`📝 Text with image references copied! (${pastedImages.length} images noted but not copied directly)`);
        return;
      }
      
      // Strategy 4: Just text content
      await navigator.clipboard.writeText(currentContent);
      toast.success('📝 Text content copied to clipboard!');
      
    } catch (error) {
      console.error('Copy error:', error);
      toast.error('❌ Failed to copy to clipboard. Try the Download HTML button for a complete backup.');
    }
  }, [currentContent, pastedImages]);

  // Select all text for manual copying
  const selectAllText = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.select();
      textareaRef.current.setSelectionRange(0, textareaRef.current.value.length);
      toast.success('📝 Text selected! Press Ctrl+C to copy manually.');
    }
  }, []);

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

    const selectedStyle = ENHANCEMENT_STYLES.find(style => style.id === selectedEnhancementStyle);
    if (!selectedStyle) {
      toast.error('Enhancement style not found');
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
              content: selectedStyle.systemPrompt
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
        toast.success(`✨ Prompt optimized with "${selectedStyle.name}" style! Use "Revert" to restore original.`);
      } else {
        throw new Error('No optimized content received');
      }
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Failed to optimize prompt. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  }, [currentContent, selectedEnhancementStyle]);

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

              {/* Pasted Images Display */}
              {(pastedImages.length > 0 || isProcessingPaste) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Attached Images</label>
                    <Badge variant="outline" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Ctrl+V to paste
                    </Badge>
                  </div>
                  
                  {isProcessingPaste && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Processing image...</span>
                    </div>
                  )}
                  
                  {pastedImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {pastedImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-full h-16 object-cover rounded border border-border"
                          />
                          
                          {/* Copy Image Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyImageToClipboard(image.id)}
                            className="absolute -top-1 -left-1 h-5 w-5 p-0 bg-primary hover:bg-primary/80 text-primary-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy image"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          
                          {/* Remove Image Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePastedImage(image.id)}
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 rounded-b truncate">
                            {image.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button onClick={copyToClipboard} size="sm" variant="outline">
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>

                  <Button onClick={selectAllText} size="sm" variant="outline" className="border-gray-500/30 text-gray-700 dark:text-gray-300 hover:bg-gray-500/10">
                    <MousePointer2 className="w-4 h-4 mr-1" />
                    Select All
                  </Button>

                  {pastedImages.length > 0 && (
                    <Button onClick={downloadPromptWithImages} size="sm" variant="outline" className="border-green-500/30 text-green-700 dark:text-green-300 hover:bg-green-500/10">
                      <Download className="w-4 h-4 mr-1" />
                      AI Package
                    </Button>
                  )}

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

                  <div className="flex items-center gap-1">
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
                          {(() => {
                            const currentStyle = ENHANCEMENT_STYLES.find(s => s.id === selectedEnhancementStyle);
                            return currentStyle ? (
                              <span className="ml-1 text-xs opacity-70">
                                {currentStyle.icon}
                              </span>
                            ) : null;
                          })()}
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={() => setShowEnhancementSettings(true)}
                      size="sm"
                      variant="outline"
                      className="px-2 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                      title={`Enhancement Settings - Current: ${ENHANCEMENT_STYLES.find(s => s.id === selectedEnhancementStyle)?.name || 'Unknown'}`}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>

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
                              {prompt.images && prompt.images.length > 0 && (
                                <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-700 dark:text-blue-300">
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  {prompt.images.length} image{prompt.images.length > 1 ? 's' : ''}
                                </Badge>
                              )}
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

      {/* Enhancement Settings Modal */}
      {showEnhancementSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Prompt Enhancement Settings
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose how you want your prompts to be optimized. Each style applies different techniques to improve your prompts.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {ENHANCEMENT_STYLES.map((style) => (
                  <div
                    key={style.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                      selectedEnhancementStyle === style.id 
                        ? 'ring-2 ring-primary ring-opacity-50 bg-muted/30 border-primary/50' 
                        : 'border-border'
                    }`}
                    onClick={() => {
                      setSelectedEnhancementStyle(style.id);
                      localStorage.setItem(ENHANCEMENT_SETTINGS_KEY, style.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0 mt-1">{style.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm">{style.name}</h3>
                          {selectedEnhancementStyle === style.id && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {style.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <Button 
                  onClick={() => setShowEnhancementSettings(false)}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEnhancementSettings(false)}
                >
                  Close
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <strong>💡 Tip:</strong> You can change the enhancement style anytime. The selected style will be used for all future prompt optimizations until you change it again.
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
    </div>
  );
}
