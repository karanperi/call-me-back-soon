import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MedicationEntry,
  InstructionKey,
  DosageUnitKey,
  INSTRUCTION_OPTIONS,
  DOSAGE_UNITS,
} from "@/lib/medicationUtils";

interface MedicationExpandedFormProps {
  medication: MedicationEntry;
  onChange: (updates: Partial<MedicationEntry>) => void;
  onCollapse?: () => void;
  onRemove?: () => void;
  isOnlyMedication: boolean;
}

export const MedicationExpandedForm = ({
  medication,
  onChange,
  onCollapse,
  isOnlyMedication,
}: MedicationExpandedFormProps) => {
  return (
    <div className="bg-secondary/30 rounded-lg p-4 border-l-2 border-primary/50 space-y-3 animate-in fade-in duration-200">
      {/* Medication Name */}
      <div className="space-y-1.5">
        <Label htmlFor={`med-name-${medication.id}`} className="text-sm">
          Medication Name *
        </Label>
        <Input
          id={`med-name-${medication.id}`}
          placeholder="e.g. Metformin, Blood pressure pill"
          value={medication.name}
          onChange={(e) => onChange({ name: e.target.value.slice(0, 100) })}
        />
      </div>

      {/* Quantity & Unit - Side by side */}
      <div className="flex gap-3">
        <div className="w-1/3 space-y-1.5">
          <Label htmlFor={`med-qty-${medication.id}`} className="text-sm">
            Quantity
          </Label>
          <Input
            id={`med-qty-${medication.id}`}
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 2"
            value={medication.quantity ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              onChange({ quantity: val ? parseFloat(val) : undefined });
            }}
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label className="text-sm">Unit</Label>
          <Select
            value={medication.unit || ''}
            onValueChange={(v) => onChange({ unit: v as DosageUnitKey || undefined })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {DOSAGE_UNITS.map((unit) => (
                <SelectItem key={unit.key} value={unit.key}>
                  {unit.plural.charAt(0).toUpperCase() + unit.plural.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-1.5">
        <Label className="text-sm">Instructions</Label>
        <Select
          value={medication.instruction}
          onValueChange={(v) => onChange({ instruction: v as InstructionKey })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select instructions" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {INSTRUCTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Done button - only when multiple medications */}
      {!isOnlyMedication && onCollapse && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onCollapse}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};
