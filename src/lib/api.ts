import type { CartItem, EsimPackage } from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function esimApi(path: string, options?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/esim-api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...options?.headers,
    },
  });
  return res.json();
}

export async function fetchPackages(locationCode = "") {
  const params = new URLSearchParams();
  if (locationCode) params.set("locationCode", locationCode);
  const data = await esimApi(`/packages?${params.toString()}`);
  if (data.success === false) return [];
  return data.obj?.packageList ?? data.packageList ?? [];
}

export async function fetchTopupPackages(iccid: string) {
  const data = await esimApi(`/packages?iccid=${iccid}`);
  if (data.success === false) return [];
  return data.obj?.packageList ?? data.packageList ?? [];
}

export async function createCheckoutSession(
  items: CartItem[],
  userId: string | null,
  guestEmail: string
) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ items, userId, guestEmail }),
  });
  return res.json();
}

export async function fetchOrderStatus(sessionId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/order-status?session_id=${sessionId}`,
    {
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    }
  );
  return res.json();
}

export async function fetchGuestOrders(email: string) {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/order-status?email=${encodeURIComponent(email)}`,
    {
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    }
  );
  return res.json();
}

export async function sendVerificationCode(email: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function verifyCode(email: string, code: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ email, code }),
  });
  return res.json();
}

// eSIMAccess API prices are in 1/10000 USD (e.g., 88000 = $8.80)
export function formatPrice(apiPrice: number): string {
  const dollars = apiPrice / 10000;
  return `$${dollars.toFixed(2)}`;
}

// eSIMAccess API volumes are in bytes
export function formatDataVolume(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    const rounded = Math.round(gb * 10) / 10;
    return rounded % 1 === 0 ? `${rounded.toFixed(0)} GB` : `${rounded.toFixed(1)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}

export function formatDuration(duration: number, unit: string): string {
  const u = unit?.toUpperCase();
  if (u === "DAY" || u === "DAYS") return `${duration} Day${duration > 1 ? "s" : ""}`;
  if (u === "MONTH" || u === "MONTHS") return `${duration} Month${duration > 1 ? "s" : ""}`;
  if (u === "YEAR" || u === "YEARS") return `${duration} Year${duration > 1 ? "s" : ""}`;
  if (u === "HOUR" || u === "HOURS") return `${duration} Hour${duration > 1 ? "s" : ""}`;
  return `${duration} ${unit}`;
}

// Get the number of countries a package covers
export function getCountryCount(pkg: EsimPackage): number {
  if (pkg.locationNetworkList && pkg.locationNetworkList.length > 0) {
    return pkg.locationNetworkList.length;
  }
  // Fallback: count comma-separated codes in location field
  if (pkg.location) {
    const codes = pkg.location.split(",").filter((c) => c.trim());
    return codes.length;
  }
  return 1;
}

// Check if a package is multinational (covers more than 1 country)
export function isMultinational(pkg: EsimPackage): boolean {
  return getCountryCount(pkg) > 1;
}

// Check if a package is a global plan (covers many countries, typically 50+)
export function isGlobalPlan(pkg: EsimPackage): boolean {
  return getCountryCount(pkg) >= 50;
}

// Check if a package is a regional plan (covers 2-49 countries)
export function isRegionalPlan(pkg: EsimPackage): boolean {
  const count = getCountryCount(pkg);
  return count >= 2 && count < 50;
}

// Get display location text
export function getLocationDisplay(pkg: EsimPackage): string {
  const count = getCountryCount(pkg);
  if (count > 1) return `${count} countries`;
  if (pkg.locationNetworkList && pkg.locationNetworkList.length === 1) {
    return pkg.locationNetworkList[0].locationName || pkg.location;
  }
  return pkg.location || "";
}

// Get the maximum network type from a package
export function getMaxNetworkType(pkg: EsimPackage): string {
  if (!pkg.locationNetworkList) return pkg.speed || "";
  const allTypes: string[] = [];
  for (const loc of pkg.locationNetworkList) {
    if (loc.operatorList) {
      for (const op of loc.operatorList) {
        if (op.networkTypeList && Array.isArray(op.networkTypeList)) {
          allTypes.push(...op.networkTypeList);
        }
      }
    }
  }
  if (allTypes.length === 0) return pkg.speed || "";
  if (allTypes.includes("5G")) return "5G";
  if (allTypes.includes("LTE") || allTypes.includes("4G")) return "4G/LTE";
  if (allTypes.includes("3G")) return "3G";
  return pkg.speed || "4G/LTE";
}

// Compute price per GB
export function getPricePerGB(pkg: EsimPackage): number {
  const gb = pkg.volume / (1024 * 1024 * 1024);
  if (gb <= 0) return 0;
  const retailPrice = pkg.retailPrice > 0 ? pkg.retailPrice : pkg.price;
  return (retailPrice / 10000) / gb;
}

// Sort packages: Global first, then by country count asc, slug prefix asc, duration asc, volume asc, price asc
export function sortPackagesDefault(packages: EsimPackage[]): EsimPackage[] {
  return [...packages].sort((a, b) => {
    // Global plans first
    const aGlobal = isGlobalPlan(a) ? 0 : isRegionalPlan(a) ? 1 : 2;
    const bGlobal = isGlobalPlan(b) ? 0 : isRegionalPlan(b) ? 1 : 2;
    if (aGlobal !== bGlobal) return aGlobal - bGlobal;

    // Country count ascending
    const aCount = getCountryCount(a);
    const bCount = getCountryCount(b);
    if (aCount !== bCount) return aCount - bCount;

    // First two letters of slug ascending
    const aSlug = (a.slug || "").substring(0, 2).toLowerCase();
    const bSlug = (b.slug || "").substring(0, 2).toLowerCase();
    if (aSlug !== bSlug) return aSlug.localeCompare(bSlug);

    // Duration ascending
    if (a.duration !== b.duration) return a.duration - b.duration;

    // Volume ascending
    if (a.volume !== b.volume) return a.volume - b.volume;

    // Price ascending
    const aPrice = a.retailPrice > 0 ? a.retailPrice : a.price;
    const bPrice = b.retailPrice > 0 ? b.retailPrice : b.price;
    return aPrice - bPrice;
  });
}

// Extract unique countries from all packages for the country selector
export function extractCountries(packages: EsimPackage[]): { code: string; name: string }[] {
  const map = new Map<string, string>();
  for (const pkg of packages) {
    if (pkg.locationNetworkList) {
      for (const loc of pkg.locationNetworkList) {
        if (loc.locationCode && loc.locationName) {
          map.set(loc.locationCode, loc.locationName);
        }
      }
    }
  }
  return Array.from(map.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Filter packages by selected countries, regions, and search
export function filterPackages(
  packages: EsimPackage[],
  selectedCountries: string[],
  selectedRegions: string[],
  searchQuery: string
): EsimPackage[] {
  let result = [...packages];

  // If countries are selected, filter to packages that cover ALL selected countries
  if (selectedCountries.length > 0) {
    result = result.filter((pkg) => {
      if (pkg.locationNetworkList) {
        const pkgCodes = new Set(pkg.locationNetworkList.map((loc) => loc.locationCode));
        return selectedCountries.every((c) => pkgCodes.has(c));
      }
      // Fallback: check location string
      return selectedCountries.every((c) => pkg.location?.includes(c));
    });
  }

  // If regions are selected, filter accordingly
  if (selectedRegions.length > 0) {
    result = result.filter((pkg) => {
      const isGlobal = isGlobalPlan(pkg);
      const isRegional = isRegionalPlan(pkg);
      if (selectedRegions.includes("global") && isGlobal) return true;
      if (selectedRegions.includes("regional") && isRegional) return true;
      return false;
    });
  }

  // Text search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        p.locationNetworkList?.some(
          (loc) => loc.locationName?.toLowerCase().includes(q)
        )
    );
  }

  return result;
}

export const REGIONS = [
  { value: "AF", label: "Africa" },
  { value: "AS", label: "Asia" },
  { value: "EU", label: "Europe" },
  { value: "ME", label: "Middle East" },
  { value: "NA", label: "North America" },
  { value: "SA", label: "South America" },
  { value: "OC", label: "Oceania" },
];
