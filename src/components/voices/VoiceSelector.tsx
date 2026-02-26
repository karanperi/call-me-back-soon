import { cn } from "@/lib/utils";

export type VoiceType = "friendly_female" | "friendly_male";

interface VoiceSelectorProps {
  selectedVoice: VoiceType;
  onSelect: (voice: VoiceType) => void;
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
  onSelect,
}: VoiceSelectorProps) => {
  return (
    <div className="space-y-4">
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
              selectedVoice === voice.id
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
