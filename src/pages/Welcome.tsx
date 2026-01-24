import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

const Welcome = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-8 shadow-lg">
          <Phone className="w-12 h-12 text-primary-foreground" />
        </div>

        {/* App name */}
        <h1 className="text-4xl font-bold text-foreground mb-3">Yaad</h1>

        {/* Tagline */}
        <p className="text-lg text-muted-foreground text-center max-w-xs">
          Never forget to remind
        </p>

        {/* Feature highlights */}
        <div className="mt-12 space-y-4 w-full max-w-xs">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold">1</span>
            </div>
            <span>Schedule voice call reminders</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold">2</span>
            </div>
            <span>AI converts your text to voice</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold">3</span>
            </div>
            <span>We make the call for you</span>
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="px-6 pb-12 space-y-4 max-w-sm mx-auto w-full">
        <Button asChild className="w-full h-12 text-base font-semibold">
          <Link to="/signup">Sign Up</Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Welcome;
