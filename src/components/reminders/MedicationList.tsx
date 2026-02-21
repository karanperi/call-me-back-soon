import { useState } from "react";
import { Plus } from "lucide-react";
import { MedicationEntry } from "@/lib/medicationUtils";
import { MedicationChip } from "./MedicationChip";
import { MedicationExpandedForm } from "./MedicationExpandedForm";

interface MedicationListProps {
  medications: MedicationEntry[];
  onChange: (medications: MedicationEntry[]) => void;
}

export const MedicationList = ({ medications, onChange }: MedicationListProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    medications.length > 0 ? medications[0].id : null
  );

  const handleMedicationChange = (id: string, updates: Partial<MedicationEntry>) => {
    onChange(
      medications.map((med) =>
        med.id === id ? { ...med, ...updates } : med
      )
    );
  };

  const handleAddMedication = () => {
    const newMed: MedicationEntry = {
      id: crypto.randomUUID(),
      name: '',
      instruction: 'none',
    };
    onChange([...medications, newMed]);
    setExpandedId(newMed.id);
  };

  const handleRemoveMedication = (id: string) => {
    const newMedications = medications.filter((med) => med.id !== id);
    
    // If we removed the expanded one, expand another
    if (expandedId === id && newMedications.length > 0) {
      const removedIndex = medications.findIndex((med) => med.id === id);
      const newExpandedIndex = Math.min(removedIndex, newMedications.length - 1);
      setExpandedId(newMedications[newExpandedIndex].id);
    }
    
    // Ensure at least one medication exists
    if (newMedications.length === 0) {
      const newMed: MedicationEntry = {
        id: crypto.randomUUID(),
        name: '',
        instruction: 'none',
      };
      onChange([newMed]);
      setExpandedId(newMed.id);
    } else {
      onChange(newMedications);
    }
  };

  const handleExpand = (id: string) => {
    setExpandedId(id);
  };

  const handleCollapse = () => {
    setExpandedId(null);
  };

  const isOnlyMedication = medications.length === 1;

  return (
    <div className="space-y-3">
      {/* Medication chips for collapsed items */}
      {medications.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {medications
            .filter((med) => med.id !== expandedId && med.name.trim())
            .map((med) => (
              <MedicationChip
                key={med.id}
                medication={med}
                onExpand={() => handleExpand(med.id)}
                onRemove={() => handleRemoveMedication(med.id)}
              />
            ))}
        </div>
      )}

      {/* Expanded form for current medication */}
      {expandedId && medications.find((med) => med.id === expandedId) && (
        <MedicationExpandedForm
          medication={medications.find((med) => med.id === expandedId)!}
          onChange={(updates) => handleMedicationChange(expandedId, updates)}
          onCollapse={!isOnlyMedication ? handleCollapse : undefined}
          onRemove={!isOnlyMedication ? () => handleRemoveMedication(expandedId) : undefined}
          isOnlyMedication={isOnlyMedication}
        />
      )}

      {/* Add another medication link - always visible */}
      <button
        type="button"
        onClick={handleAddMedication}
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors mt-2"
      >
        <Plus className="h-4 w-4" />
        Add another medication
      </button>
    </div>
  );
};
