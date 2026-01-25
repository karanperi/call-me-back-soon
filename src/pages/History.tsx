import { useState } from "react";
import { Settings, Search, Clock, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { useCallHistory } from "@/hooks/useCallHistory";
import { format, formatDistanceToNow } from "date-fns";
import { CallHistoryDetailDialog } from "@/components/history/CallHistoryDetailDialog";
import { Tables } from "@/integrations/supabase/types";

type CallHistory = Tables<"call_history">;
type Filter = "all" | "completed" | "missed" | "voicemail";

const History = () => {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedCall, setSelectedCall] = useState<CallHistory | null>(null);
  
  const filterParam = filter === "all" ? undefined : filter;
  const { data: history = [], isLoading } = useCallHistory(filterParam);

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "completed", label: "Answered" },
    { value: "missed", label: "Missed" },
    { value: "voicemail", label: "Voicemail" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success";
      case "missed":
      case "failed":
        return "bg-destructive";
      case "voicemail":
        return "bg-warning";
      default:
        return "bg-muted";
    }
  };

  const getStatusText = (item: CallHistory) => {
    const timeAgo = formatDistanceToNow(new Date(item.attempted_at), { addSuffix: true });
    
    switch (item.status) {
      case "completed":
        return `Call completed • ${timeAgo}`;
      case "missed":
        return `No answer after ${item.attempts} attempt${item.attempts > 1 ? "s" : ""} • ${timeAgo}`;
      case "voicemail":
        return `Left voicemail • ${timeAgo}`;
      case "failed":
        return `Call failed • ${timeAgo}`;
      default:
        return timeAgo;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Activity"
        leftElement={
          <button className="p-1 hover:bg-secondary rounded-full transition-colors">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        }
        rightElement={
          <button className="p-1 hover:bg-secondary rounded-full transition-colors">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
        }
      />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "py-2 px-4 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length > 0 ? (
          <>
            {/* Section header */}
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Recent Calls
            </p>

            {/* History list */}
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedCall(item)}
                  className="bg-card rounded-lg p-4 card-shadow border border-border flex items-center gap-4 cursor-pointer hover:bg-card/80 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">
                      {item.recipient_name.charAt(0)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {item.recipient_name}
                      </p>
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          getStatusColor(item.status)
                        )}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {getStatusText(item)}
                    </p>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No call history yet</h3>
            <p className="text-sm text-muted-foreground">
              Your completed calls will appear here
            </p>
          </div>
        )}
      </div>

      {/* Call Detail Dialog */}
      <CallHistoryDetailDialog
        open={!!selectedCall}
        onOpenChange={(open) => !open && setSelectedCall(null)}
        callHistory={selectedCall}
      />
    </div>
  );
};

export default History;
