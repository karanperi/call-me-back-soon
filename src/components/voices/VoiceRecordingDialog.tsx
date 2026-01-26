import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Mic, Square, Play, Pause, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useCreateVoiceClone, usePreviewVoice } from "@/hooks/useUserVoice";
import { toast } from "@/hooks/use-toast";

type Step = "intro" | "recording" | "review" | "processing" | "success";

interface VoiceRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MIN_DURATION = 10;
const RECOMMENDED_DURATION = 60;

const SCRIPT_TEXT = `Hi, this is [your name]. I'm recording my voice so I can send you personalized reminders. I want to make sure you're taking care of yourself and staying healthy.

Remember to take your medications on time – they're important for keeping you strong. And don't forget to drink plenty of water throughout the day. It's the little things that make a big difference.

I also want you to know that I think about you every single day. Even when we're not together, you're always in my heart. I hope this message brings a smile to your face and reminds you how much you mean to me.

Take care of yourself, get some rest when you need it, and know that I love you very much. I'll talk to you again soon. Sending you all my love and warmest hugs.`;

export const VoiceRecordingDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: VoiceRecordingDialogProps) => {
  const [step, setStep] = useState<Step>("intro");
  const [voiceName, setVoiceName] = useState("My Voice");
  const [consent, setConsent] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [createdVoiceId, setCreatedVoiceId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const {
    isRecording,
    duration,
    audioLevel,
    audioBlob,
    error: recordingError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  const createVoice = useCreateVoiceClone();
  const previewVoice = usePreviewVoice();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("intro");
        setVoiceName("My Voice");
        setConsent(false);
        setIsPlaying(false);
        setPlaybackProgress(0);
        setCreatedVoiceId(null);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }
        resetRecording();
      }, 300);
    }
  }, [open, resetRecording, audioUrl]);

  // Create audio URL when blob is available
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [audioBlob]);

  // Handle recording stop
  useEffect(() => {
    if (audioBlob && step === "recording") {
      setStep("review");
    }
  }, [audioBlob, step]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartRecording = async () => {
    await startRecording();
    setStep("recording");
  };

  const handleStopRecording = () => {
    if (duration < MIN_DURATION) {
      toast({
        title: `Recording too short`,
        description: `Recording must be at least ${MIN_DURATION} seconds. You recorded ${duration} seconds.`,
        variant: "destructive",
      });
      return;
    }
    stopRecording();
  };

  const handleReRecord = () => {
    resetRecording();
    setStep("intro");
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (!audioUrl || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Error playing audio:", err);
      });
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setPlaybackProgress(progress);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const handleCreateVoice = async () => {
    if (!audioBlob || !consent) return;

    // Show soft warning if under recommended duration
    if (duration < RECOMMENDED_DURATION) {
      const confirmed = window.confirm(
        `For best quality, we recommend recording at least ${RECOMMENDED_DURATION} seconds. You recorded ${duration} seconds. Continue anyway?`
      );
      if (!confirmed) return;
    }

    setStep("processing");

    try {
      const result = await createVoice.mutateAsync({
        audioBlob,
        voiceName: voiceName.trim() || "My Voice",
      });
      setCreatedVoiceId(result.voiceId);
      setStep("success");
    } catch (error) {
      toast({
        title: "Failed to create voice",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setStep("review");
    }
  };

  const handlePreviewClonedVoice = async () => {
    if (!createdVoiceId) return;

    try {
      const result = await previewVoice.mutateAsync(createdVoiceId);
      const audioUrl = `data:${result.contentType};base64,${result.audioBase64}`;
      
      if (previewAudioRef.current) {
        previewAudioRef.current.src = audioUrl;
        previewAudioRef.current.play();
      }
    } catch (error) {
      toast({
        title: "Failed to play preview",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDone = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 [&>button]:hidden" aria-describedby={undefined}>
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {step === "intro" && "Create Your Voice"}
              {step === "recording" && "Recording..."}
              {step === "review" && "Review Your Recording"}
              {step === "processing" && "Creating Your Voice..."}
              {step === "success" && "Voice Created!"}
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 -mr-2 hover:bg-secondary rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-6">
          {/* Step 1: Introduction */}
          {step === "intro" && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="w-10 h-10 text-primary" />
              </div>

              <div className="space-y-2">
                <p className="text-foreground font-medium">
                  Your loved ones will hear YOUR voice when they receive reminders.
                </p>
              </div>

              <div className="text-left bg-secondary/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Tips for a good recording:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Find a quiet place</li>
                  <li>• Speak naturally at normal pace</li>
                  <li>• Hold your device 6-8 inches away</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                Recording length: <span className="font-medium">{MIN_DURATION} sec min</span>, {RECOMMENDED_DURATION}-90 sec recommended for best quality
              </p>

              {recordingError && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{recordingError}</span>
                </div>
              )}

              <Button onClick={handleStartRecording} className="w-full h-12">
                <Mic className="mr-2 h-5 w-5" />
                Start Recording
              </Button>
            </div>
          )}

          {/* Step 2: Recording */}
          {step === "recording" && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                  <span className="text-2xl font-mono font-bold">
                    {formatDuration(duration)}
                  </span>
                </div>

                {/* Audio level visualization */}
                <div className="h-4 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-100"
                    style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="text-left bg-secondary/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Read this aloud:
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  "{SCRIPT_TEXT}"
                </p>
              </div>

              <Button
                onClick={handleStopRecording}
                variant="destructive"
                className="w-full h-12"
                disabled={duration < MIN_DURATION}
              >
                <Square className="mr-2 h-5 w-5" />
                Stop Recording
              </Button>

              <p className="text-xs text-muted-foreground">
                Minimum: {MIN_DURATION} sec | Recommended: {RECOMMENDED_DURATION} sec
              </p>
            </div>
          )}

          {/* Step 3: Review */}
          {step === "review" && (
            <div className="space-y-6">
              {/* Audio playback */}
              <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-4">
                <button
                  onClick={handlePlayPause}
                  className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-100" 
                      style={{ width: `${playbackProgress}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-mono text-muted-foreground">
                  {audioRef.current && isPlaying 
                    ? formatDuration(Math.floor(audioRef.current.currentTime))
                    : formatDuration(duration)}
                </span>
              </div>

              {audioUrl && (
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleAudioEnded}
                />
              )}

              {/* Voice name input */}
              <div className="space-y-2">
                <Label htmlFor="voiceName">Voice Name</Label>
                <Input
                  id="voiceName"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value.slice(0, 50))}
                  placeholder="My Voice"
                />
              </div>

              {/* Consent checkbox */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(checked === true)}
                />
                <label htmlFor="consent" className="text-sm text-muted-foreground cursor-pointer">
                  I confirm this is my own voice and I have the right to clone it
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleReRecord}
                  className="flex-1"
                >
                  Re-record
                </Button>
                <Button
                  onClick={handleCreateVoice}
                  className="flex-1"
                  disabled={!consent || createVoice.isPending}
                >
                  Create Voice
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Processing */}
          {step === "processing" && (
            <div className="space-y-6 text-center py-8">
              <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
              <div className="space-y-2">
                <p className="text-foreground font-medium">Processing your voice...</p>
                <p className="text-sm text-muted-foreground">
                  This usually takes 30-60 seconds
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {step === "success" && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>

              <div className="space-y-2">
                <p className="text-foreground font-medium text-lg">
                  Your voice is ready to use!
                </p>
              </div>

              {/* Preview button */}
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                  Preview:
                </p>
                <Button
                  variant="outline"
                  onClick={handlePreviewClonedVoice}
                  disabled={previewVoice.isPending}
                  className="w-full"
                >
                  {previewVoice.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  "This is a small reminder to smile today."
                </Button>
              </div>

              <audio ref={previewAudioRef} />

              <Button onClick={handleDone} className="w-full h-12">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
