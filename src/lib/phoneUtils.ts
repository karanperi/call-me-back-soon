import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  CountryCode,
  AsYouType,
} from "libphonenumber-js";
import { ALL_COUNTRIES, DEFAULT_COUNTRY, getCountryByCode, Country } from "@/config/countries";

const LAST_COUNTRY_KEY = "yaad_last_country";

// ==================== Phone Validation ====================

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string | null;
  e164: string | null;
  error?: string;
}

/**
 * Validate a phone number for a given country
 * @param phoneNumber - The phone number (local or full)
 * @param countryCode - ISO country code (e.g., "GB", "US")
 * @returns Validation result with formatted number
 */
export function validatePhoneNumber(
  phoneNumber: string,
  countryCode: CountryCode
): PhoneValidationResult {
  try {
    // Handle empty input
    if (!phoneNumber || phoneNumber.trim() === "") {
      return { isValid: false, formatted: null, e164: null };
    }

    const parsed = parsePhoneNumberFromString(phoneNumber, countryCode);

    if (!parsed) {
      return {
        isValid: false,
        formatted: null,
        e164: null,
        error: "Invalid phone number format",
      };
    }

    if (!parsed.isValid()) {
      const country = getCountryByCode(countryCode);
      const countryName = country?.name || countryCode;
      
      // Provide more specific error messages
      if (parsed.nationalNumber.length < 5) {
        return {
          isValid: false,
          formatted: null,
          e164: null,
          error: `Phone number is too short for ${countryName}`,
        };
      }
      
      return {
        isValid: false,
        formatted: null,
        e164: null,
        error: `Phone number is not valid for ${countryName}`,
      };
    }

    return {
      isValid: true,
      formatted: parsed.formatInternational(), // e.g., "+44 7700 900 123"
      e164: parsed.format("E.164"), // e.g., "+447700900123"
    };
  } catch (error) {
    return {
      isValid: false,
      formatted: null,
      e164: null,
      error: "Could not parse phone number",
    };
  }
}

/**
 * Auto-detect country from a full international number
 * @param phoneNumber - Full phone number with country code (e.g., "+91 98765 43210")
 * @returns Detected country code or null
 */
export function detectCountryFromNumber(phoneNumber: string): CountryCode | null {
  try {
    if (!phoneNumber || !phoneNumber.trim().startsWith("+")) {
      return null;
    }
    
    const parsed = parsePhoneNumberFromString(phoneNumber);
    return parsed?.country || null;
  } catch {
    return null;
  }
}

/**
 * Parse a full international number and extract the national (local) part
 * @param phoneNumber - Full phone number in E.164 format
 * @returns Object with country code and national number, or null
 */
export function parseInternationalNumber(phoneNumber: string): {
  countryCode: CountryCode;
  nationalNumber: string;
} | null {
  try {
    const parsed = parsePhoneNumberFromString(phoneNumber);
    if (parsed && parsed.country) {
      return {
        countryCode: parsed.country,
        nationalNumber: parsed.nationalNumber,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format a stored E.164 number for display
 * @param e164Number - Phone number in E.164 format (e.g., "+447700900123")
 * @returns Formatted international number (e.g., "+44 7700 900 123")
 */
export function formatPhoneForDisplay(e164Number: string): string {
  try {
    const parsed = parsePhoneNumberFromString(e164Number);
    if (parsed) {
      return parsed.formatInternational();
    }
    return e164Number; // Return original if parsing fails
  } catch {
    return e164Number;
  }
}

/**
 * Format input as user types (for real-time formatting)
 * @param input - Current input value
 * @param countryCode - ISO country code
 * @returns Formatted string
 */
export function formatAsYouType(input: string, countryCode: CountryCode): string {
  const formatter = new AsYouType(countryCode);
  return formatter.input(input);
}

// ==================== Country Persistence ====================

/**
 * Save the last selected country to localStorage
 * @param countryCode - ISO country code
 */
export function saveLastSelectedCountry(countryCode: string): void {
  try {
    localStorage.setItem(LAST_COUNTRY_KEY, countryCode);
  } catch {
    // localStorage might not be available
  }
}

/**
 * Get the last selected country from localStorage
 * @returns ISO country code (defaults to "GB" if not set)
 */
export function getLastSelectedCountry(): string {
  try {
    return localStorage.getItem(LAST_COUNTRY_KEY) || DEFAULT_COUNTRY.code;
  } catch {
    return DEFAULT_COUNTRY.code;
  }
}

/**
 * Get country info from an existing E.164 phone number
 * Useful for initializing forms with existing data
 * @param e164Number - Phone number in E.164 format
 * @returns Country object or default country
 */
export function getCountryFromE164(e164Number: string): Country {
  try {
    const parsed = parsePhoneNumberFromString(e164Number);
    if (parsed?.country) {
      const country = getCountryByCode(parsed.country);
      if (country) return country;
    }
  } catch {
    // Fall through to default
  }
  return DEFAULT_COUNTRY;
}
