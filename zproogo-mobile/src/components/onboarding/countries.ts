export type Country = { code: string; name: string; dial: string; flag: string; min: number; max: number; pattern?: RegExp };

// min/max = digits of the national number (without the dial code).
// `pattern` is an extra check where the format is well known.
export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', min: 10, max: 10, pattern: /^[6-9]\d{9}$/ },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', min: 10, max: 10, pattern: /^[2-9]\d{9}$/ },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', min: 10, max: 10, pattern: /^[2-9]\d{9}$/ },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', min: 10, max: 10, pattern: /^7\d{9}$/ },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪', min: 9, max: 9, pattern: /^5\d{8}$/ },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦', min: 9, max: 9, pattern: /^5\d{8}$/ },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦', min: 8, max: 8 },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼', min: 8, max: 8 },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲', min: 8, max: 8 },
  { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭', min: 8, max: 8 },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵', min: 10, max: 10, pattern: /^9\d{9}$/ },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩', min: 10, max: 10, pattern: /^1\d{9}$/ },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰', min: 9, max: 9, pattern: /^7\d{8}$/ },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰', min: 10, max: 10, pattern: /^3\d{9}$/ },
  { code: 'BT', name: 'Bhutan', dial: '+975', flag: '🇧🇹', min: 8, max: 8 },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬', min: 8, max: 8, pattern: /^[89]\d{7}$/ },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾', min: 9, max: 10 },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭', min: 9, max: 9 },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩', min: 9, max: 12 },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺', min: 9, max: 9, pattern: /^4\d{8}$/ },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿', min: 8, max: 10 },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪', min: 10, max: 11 },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', min: 9, max: 9, pattern: /^[67]\d{8}$/ },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹', min: 9, max: 10 },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸', min: 9, max: 9, pattern: /^[67]\d{8}$/ },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱', min: 9, max: 9, pattern: /^6\d{8}$/ },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦', min: 9, max: 9 },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪', min: 9, max: 9 },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', min: 10, max: 10 },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵', min: 10, max: 10 },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳', min: 11, max: 11, pattern: /^1\d{10}$/ },
  { code: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰', min: 8, max: 8 },
];

export const DEFAULT_COUNTRY: Country = COUNTRIES[0];
