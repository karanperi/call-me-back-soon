import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Mic2,
  Globe,
  Lock,
  LogOut,
  HelpCircle,
  Shield,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const voiceNames: Record<string, string> = {
  friendly_female: "Friendly Female",
  friendly_male: "Friendly Male",
};

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Signed out successfully" });
      navigate("/welcome");
    }
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || "Y";
  const defaultVoice = profile?.default_voice || "friendly_female";

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Profile" />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* User info card */}
        <div className="bg-card rounded-lg p-6 card-shadow border border-border mb-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-primary-foreground">
              {userInitial}
            </span>
          </div>
          <p className="font-medium text-foreground">{user?.email || "user@example.com"}</p>
          <button className="text-sm text-primary font-medium mt-2 hover:underline">
            Edit Profile
          </button>
        </div>

        {/* Preferences */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Preferences
        </p>
        <div className="bg-card rounded-lg card-shadow border border-border mb-6 overflow-hidden">
          <Link
            to="/voices"
            className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Mic2 className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Default Voice</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{voiceNames[defaultVoice]}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
          <div className="border-t border-border" />
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Country</span>
            </div>
            <span className="text-sm text-muted-foreground">United Kingdom 🇬🇧</span>
          </div>
        </div>

        {/* Account */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Account
        </p>
        <div className="bg-card rounded-lg card-shadow border border-border mb-6 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Change Password</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="border-t border-border" />
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-destructive" />
              <span className="font-medium text-destructive">Log Out</span>
            </div>
          </button>
        </div>

        {/* About */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
          About
        </p>
        <div className="bg-card rounded-lg card-shadow border border-border mb-6 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Help & Support</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="border-t border-border" />
          <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Privacy Policy</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="border-t border-border" />
          <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Terms of Service</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-sm text-muted-foreground">
          Yaad v1.0.0
        </p>
      </div>
    </div>
  );
};

export default Profile;
