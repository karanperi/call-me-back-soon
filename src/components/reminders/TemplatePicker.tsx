import { Pencil, Pill, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
export type TemplateType = "quick" | "medication";
interface Template {
  id: TemplateType | "more";
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}
const TEMPLATES: Template[] = [{
  id: "quick",
  icon: <Pencil className="h-5 w-5" />,
  label: "Quick"
}, {
  id: "medication",
  icon: <Pill className="h-5 w-5" />,
  label: "Medication"
}, {
  id: "more",
  icon: <Plus className="h-5 w-5" />,
  label: "More Soon",
  disabled: true
}];
interface TemplatePickerProps {
  selected: TemplateType;
  onSelect: (template: TemplateType) => void;
}
export const TemplatePicker = ({
  selected,
  onSelect
}: TemplatePickerProps) => {
  return <div className="px-4 py-3 border-b border-border">
      
      <div className="flex gap-2 overflow-x-auto pb-1" style={{
      scrollbarWidth: "none",
      msOverflowStyle: "none"
    }}>
        {TEMPLATES.map(template => {
        const isSelected = template.id === selected;
        const isDisabled = template.disabled;
        return <button key={template.id} type="button" onClick={() => !isDisabled && template.id !== "more" && onSelect(template.id as TemplateType)} disabled={isDisabled} className={cn("flex flex-col items-center justify-center min-w-[100px] p-3 rounded-xl border-2 transition-all", isSelected && !isDisabled ? "border-primary bg-primary/5" : "border-border hover:border-primary/50", isDisabled && "opacity-50 cursor-not-allowed hover:border-border")}>
              <div className={cn("mb-1.5", isSelected ? "text-primary" : "text-muted-foreground")}>
                {template.icon}
              </div>
              <span className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>
                {template.label}
              </span>
            </button>;
      })}
      </div>
      <style>{`
        .flex.overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>;
};