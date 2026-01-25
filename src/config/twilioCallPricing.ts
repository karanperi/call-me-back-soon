// Approximate Twilio voice call rates (USD per minute)
// These are estimates from a US number to various destinations
// Rates are subject to change - see twilio.com/voice/pricing for current rates

export interface CallPricing {
  countryCode: string;
  countryName: string;
  mobileRate: number;    // USD per minute
  landlineRate: number;  // USD per minute
}

export const callPricing: Record<string, CallPricing> = {
  // Popular destinations
  GB: { countryCode: "GB", countryName: "United Kingdom", mobileRate: 0.14, landlineRate: 0.02 },
  US: { countryCode: "US", countryName: "United States", mobileRate: 0.017, landlineRate: 0.017 },
  CA: { countryCode: "CA", countryName: "Canada", mobileRate: 0.017, landlineRate: 0.017 },
  IN: { countryCode: "IN", countryName: "India", mobileRate: 0.04, landlineRate: 0.04 },
  AU: { countryCode: "AU", countryName: "Australia", mobileRate: 0.10, landlineRate: 0.03 },
  DE: { countryCode: "DE", countryName: "Germany", mobileRate: 0.14, landlineRate: 0.02 },
  FR: { countryCode: "FR", countryName: "France", mobileRate: 0.15, landlineRate: 0.02 },
  
  // Europe
  AT: { countryCode: "AT", countryName: "Austria", mobileRate: 0.18, landlineRate: 0.03 },
  BE: { countryCode: "BE", countryName: "Belgium", mobileRate: 0.17, landlineRate: 0.03 },
  CH: { countryCode: "CH", countryName: "Switzerland", mobileRate: 0.20, landlineRate: 0.03 },
  CZ: { countryCode: "CZ", countryName: "Czech Republic", mobileRate: 0.15, landlineRate: 0.03 },
  DK: { countryCode: "DK", countryName: "Denmark", mobileRate: 0.12, landlineRate: 0.02 },
  ES: { countryCode: "ES", countryName: "Spain", mobileRate: 0.16, landlineRate: 0.02 },
  FI: { countryCode: "FI", countryName: "Finland", mobileRate: 0.18, landlineRate: 0.03 },
  GR: { countryCode: "GR", countryName: "Greece", mobileRate: 0.16, landlineRate: 0.03 },
  HU: { countryCode: "HU", countryName: "Hungary", mobileRate: 0.15, landlineRate: 0.03 },
  IE: { countryCode: "IE", countryName: "Ireland", mobileRate: 0.16, landlineRate: 0.02 },
  IT: { countryCode: "IT", countryName: "Italy", mobileRate: 0.18, landlineRate: 0.02 },
  NL: { countryCode: "NL", countryName: "Netherlands", mobileRate: 0.16, landlineRate: 0.02 },
  NO: { countryCode: "NO", countryName: "Norway", mobileRate: 0.12, landlineRate: 0.02 },
  PL: { countryCode: "PL", countryName: "Poland", mobileRate: 0.14, landlineRate: 0.03 },
  PT: { countryCode: "PT", countryName: "Portugal", mobileRate: 0.16, landlineRate: 0.03 },
  RO: { countryCode: "RO", countryName: "Romania", mobileRate: 0.12, landlineRate: 0.04 },
  RU: { countryCode: "RU", countryName: "Russia", mobileRate: 0.12, landlineRate: 0.05 },
  SE: { countryCode: "SE", countryName: "Sweden", mobileRate: 0.12, landlineRate: 0.02 },
  UA: { countryCode: "UA", countryName: "Ukraine", mobileRate: 0.12, landlineRate: 0.06 },
  
  // Asia Pacific
  BD: { countryCode: "BD", countryName: "Bangladesh", mobileRate: 0.08, landlineRate: 0.06 },
  CN: { countryCode: "CN", countryName: "China", mobileRate: 0.04, landlineRate: 0.02 },
  HK: { countryCode: "HK", countryName: "Hong Kong", mobileRate: 0.04, landlineRate: 0.02 },
  ID: { countryCode: "ID", countryName: "Indonesia", mobileRate: 0.10, landlineRate: 0.06 },
  JP: { countryCode: "JP", countryName: "Japan", mobileRate: 0.12, landlineRate: 0.08 },
  KR: { countryCode: "KR", countryName: "South Korea", mobileRate: 0.08, landlineRate: 0.04 },
  LK: { countryCode: "LK", countryName: "Sri Lanka", mobileRate: 0.12, landlineRate: 0.08 },
  MY: { countryCode: "MY", countryName: "Malaysia", mobileRate: 0.06, landlineRate: 0.03 },
  NP: { countryCode: "NP", countryName: "Nepal", mobileRate: 0.12, landlineRate: 0.10 },
  NZ: { countryCode: "NZ", countryName: "New Zealand", mobileRate: 0.12, landlineRate: 0.03 },
  PH: { countryCode: "PH", countryName: "Philippines", mobileRate: 0.19, landlineRate: 0.04 },
  PK: { countryCode: "PK", countryName: "Pakistan", mobileRate: 0.15, landlineRate: 0.08 },
  SG: { countryCode: "SG", countryName: "Singapore", mobileRate: 0.04, landlineRate: 0.02 },
  TH: { countryCode: "TH", countryName: "Thailand", mobileRate: 0.06, landlineRate: 0.04 },
  TW: { countryCode: "TW", countryName: "Taiwan", mobileRate: 0.10, landlineRate: 0.04 },
  VN: { countryCode: "VN", countryName: "Vietnam", mobileRate: 0.08, landlineRate: 0.06 },
  
  // Middle East
  AE: { countryCode: "AE", countryName: "United Arab Emirates", mobileRate: 0.18, landlineRate: 0.10 },
  IL: { countryCode: "IL", countryName: "Israel", mobileRate: 0.12, landlineRate: 0.04 },
  SA: { countryCode: "SA", countryName: "Saudi Arabia", mobileRate: 0.18, landlineRate: 0.10 },
  TR: { countryCode: "TR", countryName: "Turkey", mobileRate: 0.18, landlineRate: 0.04 },
  
  // Africa
  EG: { countryCode: "EG", countryName: "Egypt", mobileRate: 0.12, landlineRate: 0.08 },
  GH: { countryCode: "GH", countryName: "Ghana", mobileRate: 0.20, landlineRate: 0.12 },
  KE: { countryCode: "KE", countryName: "Kenya", mobileRate: 0.18, landlineRate: 0.10 },
  NG: { countryCode: "NG", countryName: "Nigeria", mobileRate: 0.25, landlineRate: 0.25 },
  ZA: { countryCode: "ZA", countryName: "South Africa", mobileRate: 0.16, landlineRate: 0.06 },
  
  // Latin America
  AR: { countryCode: "AR", countryName: "Argentina", mobileRate: 0.18, landlineRate: 0.06 },
  BR: { countryCode: "BR", countryName: "Brazil", mobileRate: 0.20, landlineRate: 0.04 },
  CL: { countryCode: "CL", countryName: "Chile", mobileRate: 0.14, landlineRate: 0.04 },
  CO: { countryCode: "CO", countryName: "Colombia", mobileRate: 0.12, landlineRate: 0.06 },
  MX: { countryCode: "MX", countryName: "Mexico", mobileRate: 0.12, landlineRate: 0.04 },
  PE: { countryCode: "PE", countryName: "Peru", mobileRate: 0.14, landlineRate: 0.06 },
  
  // Default fallback for unlisted countries
  DEFAULT: { countryCode: "DEFAULT", countryName: "Other", mobileRate: 0.20, landlineRate: 0.10 },
};

/**
 * Get the estimated call cost for a country
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "GB", "US")
 * @param durationMinutes - Call duration in minutes (default: 1)
 * @returns Object with rate, estimated cost, and currency
 */
export function getEstimatedCallCost(
  countryCode: string,
  durationMinutes: number = 1
): {
  rate: number;
  estimated: number;
  currency: string;
  countryName: string;
} {
  const pricing = callPricing[countryCode] || callPricing.DEFAULT;
  // Use mobile rate for estimation (higher rate = safer estimate)
  const rate = pricing.mobileRate;
  return {
    rate,
    estimated: rate * durationMinutes,
    currency: "USD",
    countryName: pricing.countryName,
  };
}

/**
 * Format a cost value for display
 * @param cost - Cost in USD
 * @returns Formatted string like "$0.14"
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}
