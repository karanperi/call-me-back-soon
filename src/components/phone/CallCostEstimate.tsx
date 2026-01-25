import { getEstimatedCallCost, formatCost } from "@/config/twilioCallPricing";
import { getCountryByCode } from "@/config/countries";

interface CallCostEstimateProps {
  countryCode: string;
  className?: string;
}

export const CallCostEstimate = ({ countryCode, className }: CallCostEstimateProps) => {
  const { rate, countryName } = getEstimatedCallCost(countryCode);
  const country = getCountryByCode(countryCode);
  const displayName = country?.name || countryName;

  return (
    <p className={`text-sm text-muted-foreground flex items-center gap-1.5 ${className || ""}`}>
      <span>💰</span>
      <span>
        Estimated cost: ~{formatCost(rate)}/min to {displayName}
      </span>
    </p>
  );
};
