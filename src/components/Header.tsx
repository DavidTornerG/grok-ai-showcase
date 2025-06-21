'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import VoiceAI from './VoiceAI';
import {
  Brain,
  Eye,
  Sparkles,
  Zap,
  BarChart3,
  Github,
  ExternalLink,
  Monitor,
  FileText,
  FolderOpen,
  Dna,
  Mic
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Brain className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Grok AI Showcase</h1>
                <p className="text-sm text-muted-foreground">
                  X.AI Model Testing Platform
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex bg-secondary/60 text-secondary-foreground">
              All Models Available
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <VoiceAI />
            <Button variant="outline" size="sm" asChild className="h-9 border-border/50 hover:bg-muted">
              <a
                href="https://docs.x.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Docs</span>
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-9 border-border/50 hover:bg-muted">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1"
              >
                <Github className="h-4 w-4" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-4">
          <div className="grid w-full grid-cols-2 lg:grid-cols-9 bg-background/60 border border-border/70 shadow-sm h-12 rounded-md">
            <Button
              variant={activeTab === 'chat' ? 'secondary' : 'ghost'}
              onClick={() => onTabChange('chat')}
              className="flex items-center space-x-2"
            >
              <Brain className="h-4 w-4" />
              <span>Chat</span>
            </Button>
            <Button
              variant={activeTab === 'live-view' ? 'secondary' : 'ghost'}
              onClick={() => onTabChange('live-view')}
              className="flex items-center space-x-2"
            >
              <Monitor className="h-4 w-4" />
              <span>Live View</span>
            </Button>
            <Button
              variant={activeTab === 'image-gen' ? 'secondary' : 'ghost'}
              onClick={() => onTabChange('image-gen')}
              className="flex items-center space-x-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate</span>
            </Button>
            <Button
              variant={activeTab === 'functions' ? 'secondary' : 'ghost'}
              onClick={() => onTabChange('functions')}
              className="flex items-center space-x-2"
            >
              <Zap className="h-4 w-4" />
              <span>Functions</span>
            </Button>
            <Button
              variant={activeTab === 'benchmark' ? 'secondary' : 'ghost'}
              onClick={() => onTabChange('benchmark')}
              className="flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Benchmark</span>
            </Button>
            <Button
              variant={activeTab === 'vision' ? 'secondary' : 'ghost'}
              onClick={() => onTabChange('vision')}
              className="flex items-center space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>Vision</span>
            </Button>
            <Button
              variant={activeTab === 'prompts' ? 'secondary' : 'ghost'}
              onClick={() => onTabChange('prompts')}
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Prompts</span>
            </Button>
            <Button
              variant={activeTab === 'files' ? 'secondary' : 'ghost'}
              onClick={() => onTabChange('files')}
              className="flex items-center space-x-2"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Files</span>
            </Button>
            <Button
              variant={activeTab === 'quantum-lab' ? 'secondary' : 'ghost'}
              onClick={() => onTabChange('quantum-lab')}
              className="flex items-center space-x-2"
            >
              <Dna className="h-4 w-4" />
              <span>Quantum Lab</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
