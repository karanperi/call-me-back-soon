import { useState } from "react";
import { Search, Play, Mic2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";

type Voice = "friendly_female" | "friendly_male";

interface VoiceOption {
  id: Voice;
  name: string;
  description: string;
  gradient: string;
}

const voices: VoiceOption[] = [
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

const Voices = () => {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [filter] = useState("all");

  const activeVoice = (profile?.default_voice as Voice) || "friendly_female";

  const handlePlayPreview = () => {
    toast({
      title: "Preview coming soon",
      description: "Voice previews will be available in a future update",
    });
  };

  const handleSelectVoice = async (voiceId: Voice) => {
    try {
      await updateProfile.mutateAsync({ default_voice: voiceId });
      toast({
        title: "Default voice updated",
        description: `${voices.find((v) => v.id === voiceId)?.name} is now your default`,
      });
    } catch (error) {
      toast({
        title: "Failed to update voice",
        variant: "destructive",
      });
    }
  };

  const activeVoiceData = voices.find((v) => v.id === activeVoice);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Voice Gallery"
        leftElement={
          <div className="p-1">
            <Mic2 className="w-5 h-5 text-primary" />
          </div>
        }
        rightElement={
          <button className="p-1 hover:bg-secondary rounded-full transition-colors">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
        }
      />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Filter pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4">
          {["All", "Calm", "Professional", "Energetic"].map((f) => (
            <button
              key={f}
              className={cn(
                "py-2 px-4 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                filter === f.toLowerCase()
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Available voices */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Available Voices
        </p>

        <div className="grid grid-cols-2 gap-3">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className={cn(
                "bg-card rounded-lg p-4 card-shadow border-2 transition-all",
                voice.id === activeVoice
                  ? "border-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full bg-gradient-to-br",
                      voice.gradient
                    )}
                  />
                  <button
                    onClick={handlePlayPreview}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                  >
                    <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
                  </button>
                </div>
                <p className="font-medium text-foreground text-sm mb-0.5">
                  {voice.name}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  {voice.description}
                </p>
                <Button
                  variant={voice.id === activeVoice ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => handleSelectVoice(voice.id)}
                  disabled={voice.id === activeVoice || updateProfile.isPending}
                >
                  {voice.id === activeVoice ? "Selected" : "Select"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Voices;
