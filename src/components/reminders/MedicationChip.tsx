import { Pencil, X } from "lucide-react";
import { MedicationEntry, getMedicationDisplayParts } from "@/lib/medicationUtils";

interface MedicationChipProps {
  medication: MedicationEntry;
  onExpand: () => void;
  onRemove: () => void;
}

export const MedicationChip = ({
  medication,
  onExpand,
  onRemove,
}: MedicationChipProps) => {
  const displayParts = getMedicationDisplayParts(medication);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  return (
    <div
      onClick={onExpand}
      className="inline-flex items-center gap-2 bg-secondary/80 hover:bg-secondary rounded-full px-3 py-1.5 cursor-pointer transition-colors group animate-in fade-in duration-200"
    >
      <Pencil className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
      <span className="text-sm">
        {displayParts.join(" · ")}
      </span>
      <button
        type="button"
        onClick={handleRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
        aria-label={`Remove ${medication.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};
