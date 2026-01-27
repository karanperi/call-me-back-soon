import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useVoiceReminderParser, ParsedVoiceReminder } from "@/hooks/useVoiceReminderParser";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VoiceInputSectionProps {
  onFormFilled: (data: ParsedVoiceReminder) => void;
  onFormClear: () => void;
  onTypeSwitch?: (detectedType: 'quick' | 'medication') => void;
  currentTemplate: 'quick' | 'medication';
  isDisabledGlobally: boolean;
  disabledUntilMessage?: string | null;
  sessionFailureCount: number;
  onSessionFailure: () => void;
  onDisableFor24Hours: () => void;
  className?: string;
}

type VoiceStatus = 'idle' | 'recording' | 'processing' | 'success' | 'warning';

export function VoiceInputSection({
  onFormFilled,
  onFormClear,
  onTypeSwitch,
  currentTemplate,
  isDisabledGlobally,
  disabledUntilMessage,
  sessionFailureCount,
  onSessionFailure,
  onDisableFor24Hours,
  className,
}: VoiceInputSectionProps) {
  const [accordionValue, setAccordionValue] = useState("voice-input");
  const [status, setStatus] = useState<VoiceStatus>('idle');
  
  const parser = useVoiceReminderParser();
  
  const handleTranscriptFinal = async (transcript: string) => {
    console.log('[VoiceInput] handleTranscriptFinal called with:', transcript);
    
    if (!transcript.trim()) {
      console.warn('[VoiceInput] Empty transcript, returning to idle');
      setStatus('idle');
      return;
    }
    
    setStatus('processing');
    console.log('[VoiceInput] Set status to processing, calling parser...');
    
    try {
      const result = await parser.mutateAsync(transcript);
      console.log('[VoiceInput] Parser result:', result);
      // Handle unrelated/unclear input
      if (result.data.reminder_type === 'unrelated' || result.data.reminder_type === 'unclear') {
        const newFailureCount = sessionFailureCount + 1;
        onSessionFailure();
        
        if (newFailureCount >= 2) {
          onDisableFor24Hours();
          setStatus('idle');
          toast({
            title: "Voice input disabled",
            description: "Voice will be available again in 24 hours. Please use the form below.",
            variant: "destructive"
          });
        } else {
          setStatus('warning');
          toast({
            title: "Couldn't understand that",
            description: result.data.rejection_reason || 
              "Please try again with instructions like 'Remind [name] to [action] at [time]'",
          });
        }
        return;
      }
      
      // Check for type mismatch
      if (result.data.reminder_type !== currentTemplate) {
        onTypeSwitch?.(result.data.reminder_type as 'quick' | 'medication');
      }
      
      // Clear form and fill with voice data
      onFormClear();
      onFormFilled(result.data);
      
      // Show success state
      setStatus('success');
      setAccordionValue(""); // Collapse accordion
      
      // Show success toast with additional info if needed
      let description = "Please review the details below and edit if needed.";
      if (result.data.additional_time_slots_count > 0) {
        description += ` Note: ${result.data.additional_time_slots_count} additional time slot(s) were mentioned. Please create separate reminders for those.`;
      }
      
      toast({
        title: "Form filled from voice",
        description,
      });
      
    } catch (error) {
      console.error('[VoiceInput] Voice parsing error:', error);
      setStatus('idle');
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again or use the form below.",
        variant: "destructive"
      });
    }
  };
  
  const {
    isRecording,
    transcript,
    interimTranscript,
    remainingSeconds,
    progress,
    startRecording,
    stopRecording,
    clearTranscript,
    error: recorderError,
  } = useVoiceRecorder({
    maxDurationSeconds: 60,
    onTranscriptFinal: handleTranscriptFinal,
    onTimeUp: () => {
      // Auto-stop handled by hook, transcript will be processed
    },
    onError: (error) => {
      toast({
        title: "Microphone error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Reset status when accordion expands after success
  useEffect(() => {
    if (accordionValue === "voice-input" && status === 'success') {
      setStatus('idle');
      clearTranscript();
    }
  }, [accordionValue, status, clearTranscript]);

  // Show toast when no speech is detected
  useEffect(() => {
    if (recorderError) {
      console.error('[VoiceInput] Recorder error:', recorderError);
      toast({
        title: "Microphone error",
        description: recorderError.message || "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [recorderError]);
  
  const handleMicClick = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      setStatus('recording');
      await startRecording();
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getProgressColor = () => {
    if (remainingSeconds <= 10) return 'bg-destructive';
    if (remainingSeconds <= 20) return 'bg-amber-500';
    return 'bg-primary';
  };

  // Determine accordion header content
  const getAccordionHeader = () => {
    if (isDisabledGlobally) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mic className="h-4 w-4" />
          <span>Voice unavailable</span>
          {disabledUntilMessage && (
            <span className="text-xs">
              (Available in {disabledUntilMessage})
            </span>
          )}
        </div>
      );
    }
    
    if (status === 'success') {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Form filled from voice</span>
          <span className="text-xs text-muted-foreground">(tap to re-record)</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-primary" />
        <span>Use voice to fill this form</span>
      </div>
    );
  };

  return (
    <div className={cn("px-4", className)}>
      <Accordion 
        type="single" 
        collapsible 
        value={accordionValue} 
        onValueChange={setAccordionValue}
      >
        <AccordionItem value="voice-input" className="border rounded-lg bg-secondary/30">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            {getAccordionHeader()}
          </AccordionTrigger>
          
          <AccordionContent className="px-4 pb-4">
            {isDisabledGlobally ? (
              // Disabled state content
              <div className="text-center py-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Voice input has been temporarily disabled due to repeated unsuccessful attempts.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please use the form below to create your reminder.
                </p>
                {disabledUntilMessage && (
                  <p className="text-xs text-muted-foreground">
                    Voice will be available again in {disabledUntilMessage}.
                  </p>
                )}
              </div>
            ) : status === 'warning' ? (
              // Warning state (first failure)
              <div className="space-y-4">
                <div className="flex gap-3 items-start p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Couldn't understand that as a reminder
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Please try again with instructions like:
                      <br />
                      <span className="italic">"Remind [name] to [action] at [time]"</span>
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setStatus('idle');
                    clearTranscript();
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Try again
                </Button>
              </div>
            ) : status === 'processing' ? (
              // Processing state
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Understanding your request...</p>
                {transcript && (
                  <p className="text-sm text-center text-muted-foreground italic max-w-xs">
                    "{transcript}"
                  </p>
                )}
              </div>
            ) : isRecording ? (
              // Recording state
              <div className="space-y-4">
                {/* Timer and progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-destructive animate-pulse">
                      Recording
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(remainingSeconds)} remaining
                    </span>
                  </div>
                  <Progress 
                    value={progress * 100} 
                    className="h-2"
                  />
                </div>
                
                {/* Stop button */}
                <Button
                  type="button"
                  onClick={handleMicClick}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <Square className="h-4 w-4 mr-2 fill-current" />
                  Tap to stop
                </Button>
                
                {/* Live transcript */}
                {(transcript || interimTranscript) && (
                  <div className="p-3 rounded-lg bg-background border">
                    <p className="text-sm">
                      {transcript}
                      <span className="text-muted-foreground">
                        {interimTranscript}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Idle state (ready to record)
              <div className="space-y-4">
                <Button
                  type="button"
                  onClick={handleMicClick}
                  className="w-full"
                  size="lg"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Tap to start speaking
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  You have 1 minute to describe your reminder.
                </p>
                
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Examples
                  </p>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground italic">
                      "Remind Grandma to take her blood pressure medicine at 9am every day"
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      "Create a reminder for Dad to call Mom at 6pm on weekdays"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
