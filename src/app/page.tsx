'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import VisionInterface from '@/components/VisionInterface';
import ImageGenerationInterface from '@/components/ImageGenerationInterface';
import FunctionCallingInterface from '@/components/FunctionCallingInterface';
import BenchmarkInterface from '@/components/BenchmarkInterface';
import LiveViewInterface from '@/components/LiveViewInterface';
import PromptLibrary from '@/components/PromptLibrary';
import FilesManager, { SavedFile, Project } from '@/components/FilesManager';
import CommandPalette from '@/components/CommandPalette';
import QuantumPromptLab from '@/components/QuantumPromptLab';

const STORAGE_KEY = 'grok-showcase-active-tab';

export default function HomePage() {
  const [files, setFiles] = useState<SavedFile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Scroll to top when changing tabs
  const scrollToTop = () => {
    // Immediate scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Also ensure any scrollable containers are at top
    setTimeout(() => {
      const scrollableElements = document.querySelectorAll('[class*="overflow-y-auto"], [class*="overflow-auto"], [class*="scroll"]');
      scrollableElements.forEach(element => {
        element.scrollTop = 0;
      });

      // Force another scroll to top to ensure all elements are positioned correctly
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 50);

    // Final scroll check
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 200);
  };

  // Load saved tab on component mount
  useEffect(() => {
    try {
      const savedTab = localStorage.getItem(STORAGE_KEY);
      if (savedTab && ['chat', 'live-view', 'image-gen', 'functions', 'benchmark', 'vision', 'prompts', 'files', 'quantum-lab'].includes(savedTab)) {
        setActiveTab(savedTab);
      }
    } catch (error) {
      console.warn('Failed to load saved tab from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save tab when it changes and scroll to top
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    scrollToTop();
    try {
      localStorage.setItem(STORAGE_KEY, tab);
    } catch (error) {
      console.warn('Failed to save tab to localStorage:', error);
    }
  };

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Don't render until we've loaded the saved tab to prevent flash
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={handleTabChange} />

      <main className="container mx-auto px-4 py-6">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'live-view' && <LiveViewInterface />}
        {activeTab === 'image-gen' && <ImageGenerationInterface />}
        {activeTab === 'functions' && <FunctionCallingInterface />}
        {activeTab === 'benchmark' && <BenchmarkInterface />}
        {activeTab === 'vision' && <VisionInterface />}
        {activeTab === 'prompts' && <PromptLibrary />}
        {activeTab === 'files' && <FilesManager files={files} setFiles={setFiles} projects={projects} setProjects={setProjects} selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} />}
        {activeTab === 'quantum-lab' && <QuantumPromptLab />}
      </main>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleTabChange}
        activeTab={activeTab}
      />
    </div>
  );
}
