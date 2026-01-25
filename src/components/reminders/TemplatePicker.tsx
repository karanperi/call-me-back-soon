import { Pencil, Pill, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type TemplateType = "quick" | "medication";

interface Template {
  id: TemplateType | "more";
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}

const TEMPLATES: Template[] = [
  { 
    id: "quick", 
    icon: <Pencil className="h-4 w-4" />, 
    label: "Quick" 
  },
  { 
    id: "medication", 
    icon: <Pill className="h-4 w-4" />, 
    label: "Medication" 
  },
  { 
    id: "more", 
    icon: <Plus className="h-4 w-4" />, 
    label: "More Soon", 
    disabled: true 
  },
];

interface TemplatePickerProps {
  selected: TemplateType;
  onSelect: (template: TemplateType) => void;
}

export const TemplatePicker = ({ selected, onSelect }: TemplatePickerProps) => {
  return (
    <div className="px-4 py-3 border-b border-border">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        Template
      </p>
      <div className="relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
        
        {/* Scrollable pills */}
        <div 
          className="flex gap-2 overflow-x-auto px-6 py-1"
          style={{ 
            scrollbarWidth: "none", 
            msOverflowStyle: "none",
          }}
        >
          {TEMPLATES.map((template) => {
            const isSelected = template.id === selected;
            const isDisabled = template.disabled;
            
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => !isDisabled && template.id !== "more" && onSelect(template.id as TemplateType)}
                disabled={isDisabled}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all whitespace-nowrap",
                  isSelected && !isDisabled
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/50 hover:border-primary/50 text-muted-foreground",
                  isDisabled && "opacity-50 cursor-not-allowed hover:border-border"
                )}
              >
                {template.icon}
                <span className="text-sm font-medium">
                  {template.label}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
      </div>
      <style>{`
        .flex.overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};
