'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Brain,
  Monitor,
  Image,
  Zap,
  BarChart3,
  Eye,
  FileText,
  FolderOpen,
  ArrowRight,
  Command,
  Hash,
  Dna,
  Clock,
  Star
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  activeTab: string;
}

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'recent' | 'navigation' | 'prompts' | 'files';
  searchTerms: string[];
  timestamp?: number;
  priority?: number;
}

interface RecentFile {
  id: string;
  name: string;
  category: string;
  timestamp: number;
  size?: number;
}

const RECENT_FILES_KEY = 'grok-recent-files';
const MAX_RECENT_FILES = 3;

const TAB_ITEMS = [
  { id: 'chat', label: 'Chat', icon: <Brain className="w-4 h-4" />, description: 'AI conversation interface' },
  { id: 'live-view', label: 'Live View', icon: <Monitor className="w-4 h-4" />, description: 'Real-time screen analysis' },
  { id: 'image-gen', label: 'Images', icon: <Image className="w-4 h-4" />, description: 'AI image generation' },
  { id: 'functions', label: 'Functions', icon: <Zap className="w-4 h-4" />, description: 'Function calling interface' },
  { id: 'benchmark', label: 'Benchmark', icon: <BarChart3 className="w-4 h-4" />, description: 'Model performance testing' },
  { id: 'vision', label: 'Vision', icon: <Eye className="w-4 h-4" />, description: 'Image analysis interface' },
  { id: 'prompts', label: 'Prompts', icon: <FileText className="w-4 h-4" />, description: 'Prompt library management' },
  { id: 'files', label: 'Files', icon: <FolderOpen className="w-4 h-4" />, description: 'File storage and management' },
  { id: 'quantum-lab', label: 'Quantum Lab', icon: <Dna className="w-4 h-4" />, description: 'AI-powered prompt optimization and evolution' }
];

// Track recent file access
const addToRecentFiles = (file: any) => {
  try {
    const recent: RecentFile[] = JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || '[]');

    // Remove existing entry for this file
    const filtered = recent.filter(r => r.id !== file.id);

    // Add to beginning with current timestamp
    const newRecent: RecentFile = {
      id: file.id,
      name: file.name,
      category: file.category,
      timestamp: Date.now(),
      size: file.size
    };

    filtered.unshift(newRecent);

    // Keep only the most recent files
    const trimmed = filtered.slice(0, MAX_RECENT_FILES * 2); // Keep extra for rotation

    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(trimmed));

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('recentFilesUpdated', {
      detail: { recentFiles: trimmed }
    }));
  } catch (error) {
    console.error('Failed to track recent file:', error);
  }
};

// Get recent files
const getRecentFiles = (): RecentFile[] => {
  try {
    const recent: RecentFile[] = JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || '[]');
    return recent.slice(0, MAX_RECENT_FILES);
  } catch (error) {
    console.error('Failed to get recent files:', error);
    return [];
  }
};

export default function CommandPalette({ isOpen, onClose, onNavigate, activeTab }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [savedPrompts, setSavedPrompts] = useState<any[]>([]);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved prompts and files for search
  const loadData = useCallback(() => {
    try {
      const prompts = localStorage.getItem('grok-prompt-library');
      if (prompts) {
        setSavedPrompts(JSON.parse(prompts));
      }

      const files = localStorage.getItem('grok-files-manager');
      if (files) {
        setSavedFiles(JSON.parse(files));
      }

      // Load recent files
      setRecentFiles(getRecentFiles());
    } catch (error) {
      console.error('Failed to load data for command palette:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Listen for storage changes and custom events to refresh data immediately
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'grok-files-manager' || e.key === 'grok-prompt-library' || e.key === RECENT_FILES_KEY) {
        console.log('📡 CommandPalette: Storage change detected, refreshing data');
        loadData();
      }
    };

    const handleCustomFileUpdate = (e: CustomEvent) => {
      console.log('📡 CommandPalette: Custom file update event detected');
      loadData();
    };

    const handleCustomPromptUpdate = (e: CustomEvent) => {
      console.log('📡 CommandPalette: Custom prompt update event detected');
      loadData();
    };

    const handleRecentFilesUpdate = (e: CustomEvent) => {
      console.log('📡 CommandPalette: Recent files update event detected');
      setRecentFiles(getRecentFiles());
    };

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);

    // Listen for custom events dispatched when files/prompts are updated
    window.addEventListener('filesUpdated', handleCustomFileUpdate as EventListener);
    window.addEventListener('promptsUpdated', handleCustomPromptUpdate as EventListener);
    window.addEventListener('recentFilesUpdated', handleRecentFilesUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('filesUpdated', handleCustomFileUpdate as EventListener);
      window.removeEventListener('promptsUpdated', handleCustomPromptUpdate as EventListener);
      window.removeEventListener('recentFilesUpdated', handleRecentFilesUpdate as EventListener);
    };
  }, [loadData]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Helper function to format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // Generate command items with recent files prioritized
  const generateCommandItems = useCallback((): CommandItem[] => {
    const items: CommandItem[] = [];

    // Recent files first (only if no search query)
    if (!searchQuery.trim() && recentFiles.length > 0) {
      recentFiles.forEach((recentFile, index) => {
        // Find the full file data
        const fullFile = savedFiles.find(f => f.id === recentFile.id);
        if (fullFile) {
          items.push({
            id: `recent-${recentFile.id}`,
            title: recentFile.name,
            description: `Recent: ${recentFile.category} • ${formatFileSize(recentFile.size || 0)}`,
            icon: <Clock className="w-4 h-4" />,
            action: () => {
              onNavigate('files');
              onClose();
              // Ensure scroll to top first
              window.scrollTo({ top: 0, behavior: 'instant' });
              // Auto-open the file after navigation
              setTimeout(() => {
                const fileElements = document.querySelectorAll('[data-file-id]');
                const targetFile = Array.from(fileElements).find(el =>
                  el.getAttribute('data-file-id') === recentFile.id
                );
                if (targetFile) {
                  (targetFile as HTMLElement).click();
                }
              }, 100);
            },
            category: 'recent',
            searchTerms: [recentFile.name.toLowerCase(), recentFile.category?.toLowerCase() || ''],
            timestamp: recentFile.timestamp,
            priority: 1000 - index // Higher priority for more recent files
          });
        }
      });
    }

    // Navigation items
    TAB_ITEMS.forEach((tab, index) => {
      items.push({
        id: `nav-${tab.id}`,
        title: `Go to ${tab.label}`,
        description: tab.description,
        icon: tab.icon,
        action: () => {
          onNavigate(tab.id);
          onClose();
          // Ensure scroll to top after navigation
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }, 100);
        },
        category: 'navigation',
        searchTerms: [tab.label.toLowerCase(), tab.id, tab.description.toLowerCase()],
        priority: 900 - index // Lower than recent files
      });
    });

    // Prompt items (only show if searching or no recent files)
    if (searchQuery.trim() || recentFiles.length === 0) {
      savedPrompts.forEach((prompt, index) => {
        items.push({
          id: `prompt-${prompt.id}`,
          title: prompt.title,
          description: `Prompt: ${prompt.content.substring(0, 80)}...`,
          icon: <FileText className="w-4 h-4" />,
          action: () => {
            onNavigate('prompts');
            onClose();
            // Ensure scroll to top first
            window.scrollTo({ top: 0, behavior: 'instant' });
            // Auto-load the specific prompt after navigation
            setTimeout(() => {
              const promptElements = document.querySelectorAll('[data-prompt-id]');
              const targetPrompt = Array.from(promptElements).find(el =>
                el.getAttribute('data-prompt-id') === prompt.id
              );
              if (targetPrompt) {
                (targetPrompt as HTMLElement).click();
              }
            }, 100);
          },
          category: 'prompts',
          searchTerms: [prompt.title.toLowerCase(), prompt.content.toLowerCase()],
          priority: 500 - index
        });
      });
    }

    // Other file items (only show if searching)
    if (searchQuery.trim()) {
      savedFiles.forEach((file, index) => {
        // Skip files already shown in recent
        if (!recentFiles.some(rf => rf.id === file.id)) {
          items.push({
            id: `file-${file.id}`,
            title: file.name,
            description: `File: ${file.category} • ${formatFileSize(file.size || 0)}`,
            icon: <FolderOpen className="w-4 h-4" />,
            action: () => {
              // Track this file as recently accessed
              addToRecentFiles(file);

              onNavigate('files');
              onClose();
              // Ensure scroll to top first
              window.scrollTo({ top: 0, behavior: 'instant' });
              // Auto-open the file after navigation
              setTimeout(() => {
                const fileElements = document.querySelectorAll('[data-file-id]');
                const targetFile = Array.from(fileElements).find(el =>
                  el.getAttribute('data-file-id') === file.id
                );
                if (targetFile) {
                  (targetFile as HTMLElement).click();
                }
              }, 100);
            },
            category: 'files',
            searchTerms: [file.name.toLowerCase(), file.category?.toLowerCase() || ''],
            priority: 300 - index
          });
        }
      });
    }

    // Sort by priority (higher priority first)
    return items.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [savedPrompts, savedFiles, recentFiles, searchQuery, onNavigate, onClose, formatFileSize]);

  // Filter items based on search
  const filteredItems = generateCommandItems().filter(item => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return item.searchTerms.some(term => term.includes(query)) ||
           item.title.toLowerCase().includes(query) ||
           item.description.toLowerCase().includes(query);
  });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, onClose]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  if (!isOpen) return null;

  // Group items by category for display
  const groupedItems = () => {
    const groups: { [key: string]: CommandItem[] } = {};

    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    return groups;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'recent': return <Clock className="w-4 h-4" />;
      case 'navigation': return <Hash className="w-4 h-4" />;
      case 'prompts': return <FileText className="w-4 h-4" />;
      case 'files': return <FolderOpen className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'recent': return 'Recent Files';
      case 'navigation': return 'Navigation';
      case 'prompts': return 'Prompts';
      case 'files': return 'Files';
      default: return category;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-[10vh]">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-border/50">
        <CardContent className="p-0">
          {/* Search Input */}
          <div className="relative border-b border-border">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              ref={inputRef}
              placeholder="Search tabs, prompts, files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 pl-12 pr-4 py-4 text-lg bg-transparent focus:ring-0 focus:outline-none"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-2 py-1">
                <Command className="w-3 h-3 mr-1" />
                ⌘K
              </Badge>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No results found</p>
                <p className="text-sm mt-1">Try searching for tabs, prompts, or files</p>
              </div>
            ) : (
              <div className="py-2">
                {/* Display items grouped by category in priority order */}
                {['recent', 'navigation', 'prompts', 'files'].map(category => {
                  const categoryItems = groupedItems()[category] || [];
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category} className="mb-2">
                      <div className="px-4 py-2">
                        <h3 className="text-sm font-medium text-muted-foreground capitalize flex items-center gap-2">
                          {getCategoryIcon(category)}
                          {getCategoryLabel(category)}
                          {category === 'recent' && (
                            <Star className="w-3 h-3 text-yellow-500" />
                          )}
                        </h3>
                      </div>

                      {categoryItems.map((item) => {
                        const globalIndex = filteredItems.indexOf(item);
                        const isSelected = globalIndex === selectedIndex;

                        return (
                          <button
                            key={item.id}
                            onClick={item.action}
                            className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 hover:bg-muted/50 ${
                              isSelected ? 'bg-muted' : ''
                            }`}
                          >
                            <div className="text-muted-foreground">
                              {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{item.title}</div>
                              <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                            </div>
                            {isSelected && (
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredItems.length > 0 && (
            <div className="border-t border-border p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↑↓</kbd>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd>
                    <span>Select</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd>
                    <span>Close</span>
                  </div>
                </div>
                <div>
                  {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export the helper function for other components to use
export { addToRecentFiles };
