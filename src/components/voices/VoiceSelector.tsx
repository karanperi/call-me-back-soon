import { useState, useRef } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserVoice, usePreviewVoice, UserVoice } from "@/hooks/useUserVoice";
import { toast } from "@/hooks/use-toast";

export type VoiceType = "friendly_female" | "friendly_male" | "custom";

interface VoiceSelectorProps {
  selectedVoice: VoiceType;
  customVoiceId?: string | null;
  onSelect: (voice: VoiceType, customVoiceId?: string) => void;
}

interface VoiceOption {
  id: VoiceType;
  name: string;
  description: string;
  gradient: string;
}

const AI_VOICES: VoiceOption[] = [
  {
    id: "friendly_female",
    name: "Friendly Female",
    description: "Warm & Clear",
    gradient: "from-pink-200 to-purple-200",
  },
  {
    id: "friendly_male",
    name: "Friendly Male",
    description: "Calm & Professional",
    gradient: "from-blue-200 to-cyan-200",
  },
];

export const VoiceSelector = ({
  selectedVoice,
  customVoiceId,
  onSelect,
}: VoiceSelectorProps) => {
  const { data: userVoice, isLoading } = useUserVoice();
  const previewVoice = usePreviewVoice();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreviewCustomVoice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userVoice || userVoice.status !== "ready") return;

    try {
      const result = await previewVoice.mutateAsync(userVoice.id);
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

  const isCustomSelected = selectedVoice === "custom" && customVoiceId === userVoice?.id;

  // Custom voice feature is disabled - Coming Soon
  const isCustomVoiceDisabled = true;

  return (
    <div className="space-y-4">
      {/* My Voices section - Coming Soon (always show disabled state) */}
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          My Voices
        </p>
        <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
          Soon
        </span>
      </div>
      <div
        className="w-full p-4 rounded-lg border-2 border-dashed border-muted-foreground/20 text-left opacity-50 cursor-not-allowed"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-200/50 to-emerald-200/50" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-muted-foreground">Your Voice</p>
            <p className="text-xs text-muted-foreground/70">Coming soon</p>
          </div>
        </div>
      </div>
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
      />

      {/* AI Voices section */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        AI Voices
      </p>
      <div className="grid grid-cols-2 gap-3">
        {AI_VOICES.map((voice) => (
          <button
            key={voice.id}
            type="button"
            onClick={() => onSelect(voice.id)}
            className={cn(
              "p-4 rounded-lg border-2 transition-all text-left",
              selectedVoice === voice.id && !isCustomSelected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br mb-2", voice.gradient)} />
            <p className="font-medium text-sm">{voice.name}</p>
            <p className="text-xs text-muted-foreground">{voice.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
