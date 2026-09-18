// Shared country dial codes (with flags) used by every phone field on the site,
// so the dropdown stays consistent across forms.
export interface CountryCode {
    code: string;
    country: string;
    flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+1", country: "USA", flag: "🇺🇸" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+971", country: "UAE", flag: "🇦🇪" },
    { code: "+65", country: "Singapore", flag: "🇸🇬" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
    { code: "+974", country: "Qatar", flag: "🇶🇦" },
    { code: "+968", country: "Oman", flag: "🇴🇲" },
    { code: "+977", country: "Nepal", flag: "🇳🇵" },
    { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
    { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
    { code: "+60", country: "Malaysia", flag: "🇲🇾" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+33", country: "France", flag: "🇫🇷" },
];
