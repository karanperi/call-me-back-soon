import { useState, useRef } from "react";
import { Play, Pause, Trash2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserVoice, usePreviewVoice, useDeleteVoiceClone } from "@/hooks/useUserVoice";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserVoiceCardProps {
  voice: UserVoice;
  isSelected: boolean;
  onSelect: () => void;
  onRetry?: () => void;
}

export const UserVoiceCard = ({
  voice,
  isSelected,
  onSelect,
  onRetry,
}: UserVoiceCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const previewVoice = usePreviewVoice();
  const deleteVoice = useDeleteVoiceClone();

  const handlePreview = async () => {
    if (voice.status !== "ready") return;

    try {
      const result = await previewVoice.mutateAsync(voice.id);
      const audioUrl = `data:${result.contentType};base64,${result.audioBase64}`;

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      toast({
        title: "Failed to play preview",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVoice.mutateAsync(voice.id);
      toast({ title: "Voice deleted successfully" });
      setShowDeleteConfirm(false);
    } catch (error) {
      toast({
        title: "Failed to delete voice",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  // Processing state
  if (voice.status === "processing") {
    return (
      <div className="bg-card rounded-lg p-4 card-shadow border-2 border-border">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-200 to-emerald-200 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{voice.name}</p>
            <p className="text-sm text-muted-foreground">Creating voice...</p>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  if (voice.status === "failed") {
    return (
      <div className="bg-card rounded-lg p-4 card-shadow border-2 border-destructive/30">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{voice.name}</p>
            <p className="text-sm text-destructive">Failed to create voice</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Ready state
  return (
    <>
      <div
        className={cn(
          "bg-card rounded-lg p-4 card-shadow border-2 transition-all",
          isSelected ? "border-primary" : "border-border hover:border-primary/50"
        )}
      >
        <div className="flex items-center gap-4">
          {/* Avatar with play button */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-200 to-emerald-200" />
            <button
              onClick={handlePreview}
              disabled={previewVoice.isPending}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {previewVoice.isPending ? (
                <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 text-primary-foreground" />
              ) : (
                <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
              )}
            </button>
          </div>

          {/* Voice info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{voice.name}</p>
            <p className="text-sm text-muted-foreground">Your Voice</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={onSelect}
              disabled={isSelected}
            >
              {isSelected ? "Selected" : "Select"}
            </Button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 hover:bg-destructive/10 rounded-full transition-colors text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <audio
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{voice.name}"? Any reminders using this voice will switch to the default AI voice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteVoice.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteVoice.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteVoice.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
