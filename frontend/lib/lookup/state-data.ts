// State-level median home value and homeowners insurance averages.
// Sources: Zillow Home Value Index (early 2025), Insurance Information Institute.
// Insurance average is annual premium for a ~$300k home; scaled in usage.

export type StateInfo = {
  median_value: number   // USD, median single-family home value
  insurance_avg: number  // USD, annual premium baseline at $300k value
}

export const STATE_DATA: Record<string, StateInfo> = {
  AL: { median_value: 230000, insurance_avg: 2110 },
  AK: { median_value: 360000, insurance_avg: 1080 },
  AZ: { median_value: 430000, insurance_avg: 1430 },
  AR: { median_value: 200000, insurance_avg: 2240 },
  CA: { median_value: 770000, insurance_avg: 1380 },
  CO: { median_value: 550000, insurance_avg: 2890 },
  CT: { median_value: 420000, insurance_avg: 1420 },
  DE: { median_value: 380000, insurance_avg: 870 },
  DC: { median_value: 615000, insurance_avg: 1180 },
  FL: { median_value: 395000, insurance_avg: 4220 },
  GA: { median_value: 320000, insurance_avg: 1820 },
  HI: { median_value: 840000, insurance_avg: 580 },
  ID: { median_value: 450000, insurance_avg: 1100 },
  IL: { median_value: 265000, insurance_avg: 1500 },
  IN: { median_value: 235000, insurance_avg: 1370 },
  IA: { median_value: 220000, insurance_avg: 1670 },
  KS: { median_value: 230000, insurance_avg: 2900 },
  KY: { median_value: 215000, insurance_avg: 1620 },
  LA: { median_value: 215000, insurance_avg: 3320 },
  ME: { median_value: 385000, insurance_avg: 990 },
  MD: { median_value: 425000, insurance_avg: 1290 },
  MA: { median_value: 615000, insurance_avg: 1610 },
  MI: { median_value: 235000, insurance_avg: 1130 },
  MN: { median_value: 335000, insurance_avg: 1840 },
  MS: { median_value: 180000, insurance_avg: 2380 },
  MO: { median_value: 250000, insurance_avg: 1900 },
  MT: { median_value: 460000, insurance_avg: 1750 },
  NE: { median_value: 260000, insurance_avg: 3100 },
  NV: { median_value: 430000, insurance_avg: 1080 },
  NH: { median_value: 470000, insurance_avg: 950 },
  NJ: { median_value: 510000, insurance_avg: 1130 },
  NM: { median_value: 295000, insurance_avg: 1690 },
  NY: { median_value: 470000, insurance_avg: 1430 },
  NC: { median_value: 325000, insurance_avg: 1500 },
  ND: { median_value: 250000, insurance_avg: 2080 },
  OH: { median_value: 230000, insurance_avg: 1140 },
  OK: { median_value: 205000, insurance_avg: 3650 },
  OR: { median_value: 490000, insurance_avg: 920 },
  PA: { median_value: 260000, insurance_avg: 1080 },
  RI: { median_value: 460000, insurance_avg: 1620 },
  SC: { median_value: 295000, insurance_avg: 1660 },
  SD: { median_value: 295000, insurance_avg: 2380 },
  TN: { median_value: 320000, insurance_avg: 1810 },
  TX: { median_value: 305000, insurance_avg: 3850 },
  UT: { median_value: 525000, insurance_avg: 1020 },
  VT: { median_value: 385000, insurance_avg: 970 },
  VA: { median_value: 395000, insurance_avg: 1240 },
  WA: { median_value: 605000, insurance_avg: 1090 },
  WV: { median_value: 165000, insurance_avg: 1100 },
  WI: { median_value: 285000, insurance_avg: 1020 },
  WY: { median_value: 350000, insurance_avg: 1380 },
}

export const NATIONAL_AVG: StateInfo = {
  median_value: 360000,
  insurance_avg: 1700,
}

// State name → 2-letter code (Nominatim returns full names)
export const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY',
}

export function resolveStateCode(stateRaw: string | undefined | null): string | null {
  if (!stateRaw) return null
  const trimmed = stateRaw.trim()
  if (/^[A-Z]{2}$/i.test(trimmed)) {
    const code = trimmed.toUpperCase()
    return STATE_DATA[code] ? code : null
  }
  return STATE_NAME_TO_CODE[trimmed.toLowerCase()] ?? null
}

export function getStateInfo(stateRaw: string | undefined | null): StateInfo {
  const code = resolveStateCode(stateRaw)
  return code ? STATE_DATA[code] : NATIONAL_AVG
}

// Scale insurance to value: (state_avg / 300000) * property_value
// Apply 30% discount for new construction.
export function estimateInsurance(propertyValue: number, stateInfo: StateInfo, newConstruction: boolean): number {
  const scaled = (stateInfo.insurance_avg / 300000) * propertyValue
  return newConstruction ? scaled * 0.7 : scaled
}
