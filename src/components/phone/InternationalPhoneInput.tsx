import { useState, useEffect, useCallback } from "react";
import { CountryCode } from "libphonenumber-js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountryPicker } from "./CountryPicker";
import { CallCostEstimate } from "./CallCostEstimate";
import {
  validatePhoneNumber,
  detectCountryFromNumber,
  parseInternationalNumber,
  getLastSelectedCountry,
  saveLastSelectedCountry,
  getCountryFromE164,
} from "@/lib/phoneUtils";
import { getCountryByCode, DEFAULT_COUNTRY, Country } from "@/config/countries";
import { cn } from "@/lib/utils";

interface InternationalPhoneInputProps {
  value: string; // E.164 format when valid, or local number
  onChange: (e164Value: string, isValid: boolean) => void;
  label?: string;
  placeholder?: string;
  showCostEstimate?: boolean;
  initialCountryCode?: string; // For pre-populating from existing data
  error?: string; // External error message
  id?: string;
}

export const InternationalPhoneInput = ({
  value,
  onChange,
  label = "Phone Number",
  placeholder,
  showCostEstimate = false,
  initialCountryCode,
  error: externalError,
  id = "phone",
}: InternationalPhoneInputProps) => {
  // Determine initial country
  const getInitialCountry = useCallback((): Country => {
    // If we have an existing value in E.164, detect country from it
    if (value && value.startsWith("+")) {
      return getCountryFromE164(value);
    }
    // If initial country code is provided, use it
    if (initialCountryCode) {
      const country = getCountryByCode(initialCountryCode);
      if (country) return country;
    }
    // Otherwise use last selected country
    const lastCode = getLastSelectedCountry();
    const lastCountry = getCountryByCode(lastCode);
    return lastCountry || DEFAULT_COUNTRY;
  }, [value, initialCountryCode]);

  const [selectedCountry, setSelectedCountry] = useState<Country>(getInitialCountry);
  const [localNumber, setLocalNumber] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>();
  const [isValid, setIsValid] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Initialize local number from value (for editing existing numbers)
  useEffect(() => {
    if (value && value.startsWith("+")) {
      const parsed = parseInternationalNumber(value);
      if (parsed) {
        const country = getCountryByCode(parsed.countryCode);
        if (country) {
          setSelectedCountry(country);
          setLocalNumber(parsed.nationalNumber);
          // Validate the parsed number
          const validation = validatePhoneNumber(parsed.nationalNumber, parsed.countryCode);
          setIsValid(validation.isValid);
        }
      }
    }
  }, []);

  // Validate and update parent when local number or country changes
  const validateAndUpdate = useCallback(
    (number: string, country: Country) => {
      if (!number || number.trim() === "") {
        setValidationError(undefined);
        setIsValid(false);
        onChange("", false);
        return;
      }

      const result = validatePhoneNumber(number, country.code as CountryCode);
      setIsValid(result.isValid);
      
      if (result.isValid && result.e164) {
        setValidationError(undefined);
        onChange(result.e164, true);
      } else {
        if (hasInteracted) {
          setValidationError(result.error);
        }
        onChange(number, false);
      }
    },
    [onChange, hasInteracted]
  );

  // Handle local number input change
  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setLocalNumber(input);
    setHasInteracted(true);
    validateAndUpdate(input, selectedCountry);
  };

  // Handle country selection
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    saveLastSelectedCountry(country.code);
    // Re-validate with new country
    if (localNumber) {
      validateAndUpdate(localNumber, country);
    }
  };

  // Handle paste - detect international numbers
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    
    // Check if it looks like a full international number
    if (pastedText.trim().startsWith("+")) {
      e.preventDefault();
      
      const detectedCountry = detectCountryFromNumber(pastedText);
      if (detectedCountry) {
        const country = getCountryByCode(detectedCountry);
        if (country) {
          setSelectedCountry(country);
          saveLastSelectedCountry(country.code);
          
          // Extract national number
          const parsed = parseInternationalNumber(pastedText);
          if (parsed) {
            setLocalNumber(parsed.nationalNumber);
            setHasInteracted(true);
            validateAndUpdate(parsed.nationalNumber, country);
            return;
          }
        }
      }
      
      // Fallback: just remove the + and dial code prefix if present
      const cleanNumber = pastedText.replace(/^\+\d+\s*/, "").replace(/\D/g, "");
      setLocalNumber(cleanNumber);
      setHasInteracted(true);
      validateAndUpdate(cleanNumber, selectedCountry);
    }
  };

  const displayError = externalError || validationError;
  const showError = displayError && hasInteracted && localNumber.length > 0;

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      
      <div className="flex">
        <CountryPicker
          selectedCountry={selectedCountry}
          onSelect={handleCountrySelect}
        />
        <Input
          id={id}
          type="tel"
          value={localNumber}
          onChange={handleLocalNumberChange}
          onPaste={handlePaste}
          onBlur={() => setHasInteracted(true)}
          placeholder={placeholder || "Enter phone number"}
          className={cn(
            "rounded-l-none flex-1",
            showError && "border-destructive focus-visible:ring-destructive"
          )}
        />
      </div>

      {showError && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <span>⚠️</span> {displayError}
        </p>
      )}

      {showCostEstimate && isValid && (
        <CallCostEstimate countryCode={selectedCountry.code} />
      )}
    </div>
  );
};
