import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Phone, Loader2 } from "lucide-react";
import { formatPhoneForDisplay, getCountryFromE164 } from "@/lib/phoneUtils";
import { getEstimatedCallCost, formatCost } from "@/config/twilioCallPricing";

interface TestCallConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  recipientName: string;
  phoneNumber: string;
  voice: string;
  isLoading?: boolean;
}

export const TestCallConfirmation = ({
  open,
  onOpenChange,
  onConfirm,
  recipientName,
  phoneNumber,
  voice,
  isLoading = false,
}: TestCallConfirmationProps) => {
  const formattedPhone = formatPhoneForDisplay(phoneNumber);
  const country = getCountryFromE164(phoneNumber);
  const { rate } = getEstimatedCallCost(country.code);

  const getVoiceLabel = (v: string) => {
    switch (v) {
      case "friendly_female":
        return "Friendly Female";
      case "friendly_male":
        return "Friendly Male";
      default:
        return v;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">Make Test Call?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              {/* Recipient Info */}
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-center">
                <div className="flex items-center justify-center gap-2 text-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="font-medium">Calling: {recipientName}</span>
                </div>
                <p className="text-sm">
                  {formattedPhone} ({country.name})
                </p>
              </div>

              {/* Cost Estimate */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <span>💰</span>
                <span>Estimated cost: ~{formatCost(rate)}/min</span>
              </div>

              {/* Voice */}
              <p className="text-sm text-center">
                Message will be read by: <span className="font-medium">{getVoiceLabel(voice)}</span>
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2">
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Calling...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4" />
                Call Now
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
