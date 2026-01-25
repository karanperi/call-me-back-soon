import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Phone, User, MessageSquare, Calendar, Clock, Globe, CheckCircle, XCircle, Voicemail, AlertTriangle, Loader2, Copy } from "lucide-react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";
import { getDefaultTimezone } from "@/lib/timezones";
import { formatPhoneForDisplay } from "@/lib/phoneUtils";

type CallHistory = Tables<"call_history"> & {
  error_message?: string | null;
};

interface CallHistoryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callHistory: CallHistory | null;
  onDuplicate?: (callHistory: CallHistory) => void;
}

export const CallHistoryDetailDialog = ({
  open,
  onOpenChange,
  callHistory,
  onDuplicate,
}: CallHistoryDetailDialogProps) => {
  if (!callHistory) return null;

  const userTimezone = getDefaultTimezone();
  const attemptedDate = new Date(callHistory.attempted_at);
  const zonedDate = toZonedTime(attemptedDate, userTimezone);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "missed":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "failed":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "voicemail":
        return <Voicemail className="h-5 w-5 text-warning" />;
      case "in_progress":
        return <Loader2 className="h-5 w-5 text-warning animate-spin" />;
      case "pending":
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Phone className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Call Completed";
      case "missed":
        return "Call Missed";
      case "failed":
        return "Call Failed";
      case "voicemail":
        return "Voicemail Left";
      case "in_progress":
        return "Call In Progress";
      case "pending":
        return "Preparing Call";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/20";
      case "missed":
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "voicemail":
      case "in_progress":
        return "bg-warning/10 text-warning border-warning/20";
      case "pending":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getVoiceLabel = (voice: string) => {
    switch (voice) {
      case "friendly_female":
        return "Friendly Female";
      case "friendly_male":
        return "Friendly Male";
      default:
        return voice;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 bg-card z-10 px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 hover:bg-secondary rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
            <DialogTitle className="text-lg font-semibold">
              Call Details
            </DialogTitle>
            <div className="w-7" /> {/* Spacer for alignment */}
          </div>
          <DialogDescription className="sr-only">
            Details of the call to {callHistory.recipient_name}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full border",
              getStatusColor(callHistory.status)
            )}>
              {getStatusIcon(callHistory.status)}
              <span className="font-medium">{getStatusText(callHistory.status)}</span>
            </div>
          </div>

          {/* Recipient Details */}
          <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recipient
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{callHistory.recipient_name}</p>
                <p className="text-sm text-muted-foreground">{formatPhoneForDisplay(callHistory.phone_number)}</p>
              </div>
            </div>
          </div>

          {/* Schedule Details */}
          <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Schedule
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(zonedDate, "MMM d, yyyy")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{format(zonedDate, "h:mm a")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 col-span-2">
                <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Timezone</p>
                  <p className="font-medium">{userTimezone.replace(/_/g, " ")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Call Details */}
          <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Call Info
            </p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Voice</span>
                <span className="font-medium">{getVoiceLabel(callHistory.voice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Attempts</span>
                <span className="font-medium">{callHistory.attempts}</span>
              </div>
              {callHistory.duration_seconds && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="font-medium">{callHistory.duration_seconds}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Details (for failed calls) */}
          {callHistory.status === "failed" && callHistory.error_message && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-4">
              <p className="text-xs font-medium text-destructive uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Error Details
              </p>
              <p className="text-sm text-destructive leading-relaxed">
                {callHistory.error_message}
              </p>
            </div>
          )}

          {/* Message */}
          <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {callHistory.message}
            </p>
          </div>

          {/* Duplicate Button */}
          {onDuplicate && (
            <Button
              onClick={() => {
                onDuplicate(callHistory);
                onOpenChange(false);
              }}
              className="w-full"
              variant="outline"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate as New Reminder
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
