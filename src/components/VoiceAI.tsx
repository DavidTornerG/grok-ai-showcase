'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';
import { toast } from 'sonner';

export default function VoiceAI() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleToggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = handleStop;
      mediaRecorderRef.current.start();
      setIsListening(true);
      toast.info('Voice AI activated');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    toast.info('Voice AI deactivated');
  };

  const handleStop = async () => {
    setIsProcessing(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'grok-1.5-speech');

    try {
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Speech-to-text API failed');
      }

      const result = await response.json();
      setTranscribedText(result.text);
      handleCommand(result.text);
      toast.success('Transcription successful');
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast.error('Failed to transcribe audio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommand = (command: string) => {
    const lowerCaseCommand = command.toLowerCase();

    if (lowerCaseCommand.startsWith('open the latest')) {
      // Handle opening the latest file
      console.log('Opening the latest file...');
    } else if (lowerCaseCommand.startsWith('show me the recent')) {
      // Handle showing recent files
      console.log('Showing recent files...');
    } else if (lowerCaseCommand.startsWith('navigate to')) {
      // Handle navigation
      const destination = lowerCaseCommand.replace('navigate to', '').trim();
      console.log(`Navigating to ${destination}...`);
    } else if (lowerCaseCommand.startsWith('display all')) {
      // Handle displaying all files of a certain type
      console.log('Displaying all files...');
    } else if (lowerCaseCommand.startsWith('find the file about')) {
      // Handle finding a file by topic
      const topic = lowerCaseCommand.replace('find the file about', '').trim();
      console.log(`Finding file about ${topic}...`);
    }
  };

  return (
    <Button
      variant={isListening ? 'secondary' : 'outline'}
      size="sm"
      className="h-9 border-border/50 hover:bg-muted"
      onClick={handleToggleListening}
      disabled={isProcessing}
    >
      <Mic className={`h-4 w-4 ${isListening ? 'text-primary' : ''} ${isProcessing ? 'animate-pulse' : ''}`} />
    </Button>
  );
}
