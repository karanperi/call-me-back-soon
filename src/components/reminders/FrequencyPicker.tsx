import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CustomFrequencyDialog } from "./CustomFrequencyDialog";
import {
  FrequencyConfig,
  FrequencyType,
  getPresetLabel,
  getRecurrenceSummary,
  getDefaultConfig,
} from "@/lib/recurrenceUtils";

interface FrequencyPickerProps {
  referenceDate: Date;
  value: FrequencyConfig;
  onChange: (config: FrequencyConfig) => void;
}

const PRESET_FREQUENCIES: FrequencyType[] = [
  "once",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "weekdays",
  "weekends",
];

export const FrequencyPicker = ({
  referenceDate,
  value,
  onChange,
}: FrequencyPickerProps) => {
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  const handlePresetChange = (preset: string) => {
    if (preset === "custom") {
      setCustomDialogOpen(true);
    } else {
      const newConfig = getDefaultConfig(preset as FrequencyType, referenceDate);
      onChange(newConfig);
    }
  };

  const handleCustomSave = (config: FrequencyConfig) => {
    onChange(config);
    setCustomDialogOpen(false);
  };

  // Determine the current display value
  const getCurrentValue = (): string => {
    if (value.frequency === "custom") {
      return "custom";
    }
    // If it has custom properties like interval > 1, treat as custom
    if (value.interval && value.interval > 1) {
      return "custom";
    }
    return value.frequency;
  };

  // Get display text for the current selection
  const getDisplayText = (): string => {
    const currentValue = getCurrentValue();
    if (currentValue === "custom" || value.frequency === "custom") {
      return getRecurrenceSummary(value, referenceDate);
    }
    return getPresetLabel(value.frequency, referenceDate);
  };

  return (
    <div className="space-y-2">
      <Label>Frequency</Label>
      <Select value={getCurrentValue()} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full">
          <SelectValue>{getDisplayText()}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {PRESET_FREQUENCIES.map((preset) => (
            <SelectItem key={preset} value={preset}>
              {getPresetLabel(preset, referenceDate)}
            </SelectItem>
          ))}
          <div className="border-t border-border my-1" />
          <SelectItem value="custom">
            <span className="flex items-center gap-2">
              Custom...
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <CustomFrequencyDialog
        open={customDialogOpen}
        onOpenChange={setCustomDialogOpen}
        referenceDate={referenceDate}
        initialConfig={value}
        onSave={handleCustomSave}
      />
    </div>
  );
};
