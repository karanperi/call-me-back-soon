import { useState, useEffect } from "react";
import { format, getDay, getDate } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FrequencyConfig,
  EndType,
  RecurrenceUnit,
  MonthlyType,
  getRecurrenceSummary,
} from "@/lib/recurrenceUtils";

interface CustomFrequencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceDate: Date;
  initialConfig: FrequencyConfig;
  onSave: (config: FrequencyConfig) => void;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_ORDINALS = [
  { value: 1, label: "first" },
  { value: 2, label: "second" },
  { value: 3, label: "third" },
  { value: 4, label: "fourth" },
  { value: -1, label: "last" },
];

export const CustomFrequencyDialog = ({
  open,
  onOpenChange,
  referenceDate,
  initialConfig,
  onSave,
}: CustomFrequencyDialogProps) => {
  // Form state
  const [interval, setInterval] = useState(1);
  const [unit, setUnit] = useState<RecurrenceUnit>("weeks");
  const [selectedDays, setSelectedDays] = useState<number[]>([getDay(referenceDate)]);
  const [monthlyType, setMonthlyType] = useState<MonthlyType>("day_of_month");
  const [dayOfMonth, setDayOfMonth] = useState(getDate(referenceDate));
  const [weekOfMonth, setWeekOfMonth] = useState(1);
  const [dayOfWeekForMonthly, setDayOfWeekForMonthly] = useState(getDay(referenceDate));
  const [endType, setEndType] = useState<EndType>("never");
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [maxOccurrences, setMaxOccurrences] = useState(10);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);

  // Initialize from initial config
  useEffect(() => {
    if (open && initialConfig) {
      setInterval(initialConfig.interval || 1);
      
      // Determine unit from frequency
      if (initialConfig.frequency === "monthly") {
        setUnit("months");
      } else if (initialConfig.frequency === "yearly") {
        setUnit("years");
      } else if (initialConfig.frequency === "daily") {
        setUnit("days");
      } else {
        setUnit("weeks");
      }
      
      setSelectedDays(initialConfig.daysOfWeek || [getDay(referenceDate)]);
      setMonthlyType(initialConfig.monthlyType || "day_of_month");
      setDayOfMonth(initialConfig.dayOfMonth || getDate(referenceDate));
      setWeekOfMonth(initialConfig.weekOfMonth || 1);
      setDayOfWeekForMonthly(initialConfig.dayOfWeekForMonthly || getDay(referenceDate));
      setEndType(initialConfig.endType || "never");
      setEndDate(initialConfig.endDate ? new Date(initialConfig.endDate) : undefined);
      setMaxOccurrences(initialConfig.maxOccurrences || 10);
    }
  }, [open, initialConfig, referenceDate]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        // Don't allow deselecting all days
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const selectWeekdays = () => {
    setSelectedDays([1, 2, 3, 4, 5]);
  };

  const selectWeekends = () => {
    setSelectedDays([0, 6]);
  };

  const clearDays = () => {
    // Select only the reference date's day
    setSelectedDays([getDay(referenceDate)]);
  };

  const handleSave = () => {
    const config: FrequencyConfig = {
      frequency: "custom",
      interval,
      endType,
      endDate: endType === "on_date" ? endDate : undefined,
      maxOccurrences: endType === "after_count" ? maxOccurrences : undefined,
    };

    if (unit === "weeks") {
      config.daysOfWeek = selectedDays;
    } else if (unit === "months") {
      config.monthlyType = monthlyType;
      if (monthlyType === "day_of_month") {
        config.dayOfMonth = dayOfMonth;
      } else {
        config.weekOfMonth = weekOfMonth;
        config.dayOfWeekForMonthly = dayOfWeekForMonthly;
      }
    }

    onSave(config);
  };

  // Generate preview text
  const previewConfig: FrequencyConfig = {
    frequency: "custom",
    interval,
    daysOfWeek: unit === "weeks" ? selectedDays : undefined,
    monthlyType: unit === "months" ? monthlyType : undefined,
    dayOfMonth: unit === "months" && monthlyType === "day_of_month" ? dayOfMonth : undefined,
    weekOfMonth: unit === "months" && monthlyType === "week_of_month" ? weekOfMonth : undefined,
    dayOfWeekForMonthly: unit === "months" && monthlyType === "week_of_month" ? dayOfWeekForMonthly : undefined,
    endType,
    endDate: endType === "on_date" ? endDate : undefined,
    maxOccurrences: endType === "after_count" ? maxOccurrences : undefined,
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom Recurrence</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Repeat Interval */}
          <div className="space-y-2">
            <Label>Repeat every</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={99}
                value={interval}
                onChange={(e) => setInterval(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                className="w-20"
              />
              <Select value={unit} onValueChange={(v) => setUnit(v as RecurrenceUnit)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="days">day{interval !== 1 ? "s" : ""}</SelectItem>
                  <SelectItem value="weeks">week{interval !== 1 ? "s" : ""}</SelectItem>
                  <SelectItem value="months">month{interval !== 1 ? "s" : ""}</SelectItem>
                  <SelectItem value="years">year{interval !== 1 ? "s" : ""}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Day of Week Selection (for weeks) */}
          {unit === "weeks" && (
            <div className="space-y-3">
              <Label>Repeat on</Label>
              <div className="flex gap-1.5 mb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectWeekdays}
                  className="text-xs"
                >
                  Weekdays
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectWeekends}
                  className="text-xs"
                >
                  Weekends
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearDays}
                  className="text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              </div>
              <div className="flex gap-1.5 justify-between">
                {DAY_LABELS.map((label, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={cn(
                      "w-10 h-10 rounded-full text-sm font-medium transition-colors",
                      selectedDays.includes(index)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Options */}
          {unit === "months" && (
            <div className="space-y-3">
              <Label>Repeat on</Label>
              <RadioGroup
                value={monthlyType}
                onValueChange={(v) => setMonthlyType(v as MonthlyType)}
                className="space-y-3"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="day_of_month" id="day_of_month" />
                  <Label htmlFor="day_of_month" className="flex items-center gap-2 font-normal cursor-pointer">
                    On day
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                      className="w-16 h-8"
                      onClick={() => setMonthlyType("day_of_month")}
                    />
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="week_of_month" id="week_of_month" />
                  <Label htmlFor="week_of_month" className="flex items-center gap-2 font-normal cursor-pointer flex-wrap">
                    On the
                    <Select
                      value={weekOfMonth.toString()}
                      onValueChange={(v) => {
                        setWeekOfMonth(parseInt(v));
                        setMonthlyType("week_of_month");
                      }}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {WEEK_ORDINALS.map(({ value, label }) => (
                          <SelectItem key={value} value={value.toString()}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={dayOfWeekForMonthly.toString()}
                      onValueChange={(v) => {
                        setDayOfWeekForMonthly(parseInt(v));
                        setMonthlyType("week_of_month");
                      }}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {DAY_NAMES_FULL.map((name, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* End Condition */}
          <div className="space-y-3">
            <Label>Ends</Label>
            <RadioGroup
              value={endType}
              onValueChange={(v) => setEndType(v as EndType)}
              className="space-y-3"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="never" id="end_never" />
                <Label htmlFor="end_never" className="font-normal cursor-pointer">
                  Never
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="on_date" id="end_on_date" />
                <Label htmlFor="end_on_date" className="flex items-center gap-2 font-normal cursor-pointer">
                  On
                  <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-36 justify-start text-left font-normal h-8",
                          !endDate && "text-muted-foreground"
                        )}
                        onClick={() => setEndType("on_date")}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => {
                          setEndDate(d);
                          setEndDatePickerOpen(false);
                          setEndType("on_date");
                        }}
                        disabled={(d) => d < tomorrow}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="after_count" id="end_after" />
                <Label htmlFor="end_after" className="flex items-center gap-2 font-normal cursor-pointer">
                  After
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={maxOccurrences}
                    onChange={(e) => setMaxOccurrences(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
                    className="w-16 h-8"
                    onClick={() => setEndType("after_count")}
                  />
                  occurrences
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview */}
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Preview:</p>
            <p className="text-sm font-medium mt-1">
              {getRecurrenceSummary(previewConfig, referenceDate)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
