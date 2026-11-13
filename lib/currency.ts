// lib/currency.ts
// ALIMXL — Shared Offline Currency Definitions
//
// Contains 100 distinct supported currency codes.
//
// Responsibilities:
// - Maintain currency definitions.
// - Validate and normalize supported currency codes.
// - Provide dropdown options and search.
// - Provide monetary cell-format settings.
// - Format monetary display text.
//
// This module does NOT:
// - Convert money between currencies.
// - Fetch exchange rates.
// - Create dropdown UI.
// - Modify workbook values.
// - Store application settings.
//
// Each template/workbook manages its own selected currency.
//
// Maintenance note:
// Currency codes and official minor units may change.
// This is a static offline list, not a live currency registry.

export interface CurrencyDefinition {
  readonly code: string;
  readonly name: string;
  readonly nameBn: string;
  readonly fractionDigits: number;
}

// ------------------------------------------------------------
// Supported currencies
//
// fractionDigits represents configured monetary minor-unit
// precision. It does not implement cash-rounding rules.
//
// Some currencies are shared by multiple countries or used
// in territories. This is a list of 100 currencies, not a
// one-currency-per-sovereign-country mapping.
// ------------------------------------------------------------

export const SUPPORTED_CURRENCIES = [
  // 001
  {
    code: "BDT",
    name: "Bangladeshi Taka",
    nameBn: "বাংলাদেশি টাকা",
    fractionDigits: 2,
  },
  // 002
  {
    code: "USD",
    name: "US Dollar",
    nameBn: "মার্কিন ডলার",
    fractionDigits: 2,
  },
  // 003
  {
    code: "EUR",
    name: "Euro",
    nameBn: "ইউরো",
    fractionDigits: 2,
  },
  // 004
  {
    code: "GBP",
    name: "Pound Sterling",
    nameBn: "ব্রিটিশ পাউন্ড",
    fractionDigits: 2,
  },
  // 005
  {
    code: "INR",
    name: "Indian Rupee",
    nameBn: "ভারতীয় রুপি",
    fractionDigits: 2,
  },
  // 006
  {
    code: "AED",
    name: "UAE Dirham",
    nameBn: "সংযুক্ত আরব আমিরাতের দিরহাম",
    fractionDigits: 2,
  },
  // 007
  {
    code: "SAR",
    name: "Saudi Riyal",
    nameBn: "সৌদি রিয়াল",
    fractionDigits: 2,
  },
  // 008
  {
    code: "QAR",
    name: "Qatari Riyal",
    nameBn: "কাতারি রিয়াল",
    fractionDigits: 2,
  },
  // 009
  {
    code: "KWD",
    name: "Kuwaiti Dinar",
    nameBn: "কুয়েতি দিনার",
    fractionDigits: 3,
  },
  // 010
  {
    code: "BHD",
    name: "Bahraini Dinar",
    nameBn: "বাহরাইনি দিনার",
    fractionDigits: 3,
  },
  // 011
  {
    code: "OMR",
    name: "Omani Rial",
    nameBn: "ওমানি রিয়াল",
    fractionDigits: 3,
  },
  // 012
  {
    code: "AUD",
    name: "Australian Dollar",
    nameBn: "অস্ট্রেলীয় ডলার",
    fractionDigits: 2,
  },
  // 013
  {
    code: "CAD",
    name: "Canadian Dollar",
    nameBn: "কানাডীয় ডলার",
    fractionDigits: 2,
  },
  // 014
  {
    code: "NZD",
    name: "New Zealand Dollar",
    nameBn: "নিউজিল্যান্ড ডলার",
    fractionDigits: 2,
  },
  // 015
  {
    code: "SGD",
    name: "Singapore Dollar",
    nameBn: "সিঙ্গাপুর ডলার",
    fractionDigits: 2,
  },
  // 016
  {
    code: "MYR",
    name: "Malaysian Ringgit",
    nameBn: "মালয়েশীয় রিঙ্গিত",
    fractionDigits: 2,
  },
  // 017
  {
    code: "CNY",
    name: "Chinese Yuan",
    nameBn: "চীনা ইউয়ান",
    fractionDigits: 2,
  },
  // 018
  {
    code: "JPY",
    name: "Japanese Yen",
    nameBn: "জাপানি ইয়েন",
    fractionDigits: 0,
  },
  // 019
  {
    code: "KRW",
    name: "South Korean Won",
    nameBn: "দক্ষিণ কোরীয় ওন",
    fractionDigits: 0,
  },
  // 020
  {
    code: "CHF",
    name: "Swiss Franc",
    nameBn: "সুইস ফ্রাঁ",
    fractionDigits: 2,
  },
  // 021
  {
    code: "HKD",
    name: "Hong Kong Dollar",
    nameBn: "হংকং ডলার",
    fractionDigits: 2,
  },
  // 022
  {
    code: "THB",
    name: "Thai Baht",
    nameBn: "থাই বাত",
    fractionDigits: 2,
  },
  // 023
  {
    code: "PKR",
    name: "Pakistani Rupee",
    nameBn: "পাকিস্তানি রুপি",
    fractionDigits: 2,
  },
  // 024
  {
    code: "NPR",
    name: "Nepalese Rupee",
    nameBn: "নেপালি রুপি",
    fractionDigits: 2,
  },
  // 025
  {
    code: "LKR",
    name: "Sri Lankan Rupee",
    nameBn: "শ্রীলঙ্কান রুপি",
    fractionDigits: 2,
  },
  // 026
  {
    code: "ZAR",
    name: "South African Rand",
    nameBn: "দক্ষিণ আফ্রিকান র‌্যান্ড",
    fractionDigits: 2,
  },
  // 027
  {
    code: "IDR",
    name: "Indonesian Rupiah",
    nameBn: "ইন্দোনেশীয় রুপিয়াহ",
    fractionDigits: 2,
  },
  // 028
  {
    code: "PHP",
    name: "Philippine Peso",
    nameBn: "ফিলিপাইন পেসো",
    fractionDigits: 2,
  },
  // 029
  {
    code: "VND",
    name: "Vietnamese Dong",
    nameBn: "ভিয়েতনামি ডং",
    fractionDigits: 0,
  },
  // 030
  {
    code: "BRL",
    name: "Brazilian Real",
    nameBn: "ব্রাজিলীয় রিয়াল",
    fractionDigits: 2,
  },
  // 031
  {
    code: "MXN",
    name: "Mexican Peso",
    nameBn: "মেক্সিকান পেসো",
    fractionDigits: 2,
  },
  // 032
  {
    code: "TRY",
    name: "Turkish Lira",
    nameBn: "তুর্কি লিরা",
    fractionDigits: 2,
  },
  // 033
  {
    code: "SEK",
    name: "Swedish Krona",
    nameBn: "সুইডিশ ক্রোনা",
    fractionDigits: 2,
  },
  // 034
  {
    code: "NOK",
    name: "Norwegian Krone",
    nameBn: "নরওয়েজীয় ক্রোনে",
    fractionDigits: 2,
  },
  // 035
  {
    code: "DKK",
    name: "Danish Krone",
    nameBn: "ড্যানিশ ক্রোনে",
    fractionDigits: 2,
  },
  // 036
  {
    code: "PLN",
    name: "Polish Zloty",
    nameBn: "পোলিশ জ্লোটি",
    fractionDigits: 2,
  },
  // 037
  {
    code: "RUB",
    name: "Russian Ruble",
    nameBn: "রুশ রুবল",
    fractionDigits: 2,
  },
  // 038
  {
    code: "NGN",
    name: "Nigerian Naira",
    nameBn: "নাইজেরীয় নাইরা",
    fractionDigits: 2,
  },
  // 039
  {
    code: "EGP",
    name: "Egyptian Pound",
    nameBn: "মিশরীয় পাউন্ড",
    fractionDigits: 2,
  },
  // 040
  {
    code: "MAD",
    name: "Moroccan Dirham",
    nameBn: "মরক্কোর দিরহাম",
    fractionDigits: 2,
  },
  // 041
  {
    code: "KES",
    name: "Kenyan Shilling",
    nameBn: "কেনীয় শিলিং",
    fractionDigits: 2,
  },
  // 042
  {
    code: "GHS",
    name: "Ghanaian Cedi",
    nameBn: "ঘানার সেডি",
    fractionDigits: 2,
  },
  // 043
  {
    code: "TZS",
    name: "Tanzanian Shilling",
    nameBn: "তানজানীয় শিলিং",
    fractionDigits: 2,
  },
  // 044
  {
    code: "UGX",
    name: "Ugandan Shilling",
    nameBn: "উগান্ডার শিলিং",
    fractionDigits: 0,
  },
  // 045
  {
    code: "JOD",
    name: "Jordanian Dinar",
    nameBn: "জর্ডানীয় দিনার",
    fractionDigits: 3,
  },
  // 046
  {
    code: "ILS",
    name: "Israeli New Shekel",
    nameBn: "ইসরায়েলি নতুন শেকেল",
    fractionDigits: 2,
  },
  // 047
  {
    code: "TWD",
    name: "New Taiwan Dollar",
    nameBn: "নতুন তাইওয়ান ডলার",
    fractionDigits: 2,
  },
  // 048
  {
    code: "ARS",
    name: "Argentine Peso",
    nameBn: "আর্জেন্টাইন পেসো",
    fractionDigits: 2,
  },
  // 049
  {
    code: "CLP",
    name: "Chilean Peso",
    nameBn: "চিলির পেসো",
    fractionDigits: 0,
  },
  // 050
  {
    code: "COP",
    name: "Colombian Peso",
    nameBn: "কলম্বিয়ান পেসো",
    fractionDigits: 2,
  },
  // 051
  {
    code: "AFN",
    name: "Afghan Afghani",
    nameBn: "আফগান আফগানি",
    fractionDigits: 2,
  },
  // 052
  {
    code: "ALL",
    name: "Albanian Lek",
    nameBn: "আলবেনীয় লেক",
    fractionDigits: 2,
  },
  // 053
  {
    code: "AMD",
    name: "Armenian Dram",
    nameBn: "আর্মেনীয় দ্রাম",
    fractionDigits: 2,
  },
  // 054
  {
    code: "AOA",
    name: "Angolan Kwanza",
    nameBn: "অ্যাঙ্গোলার কোয়ানজা",
    fractionDigits: 2,
  },
  // 055
  {
    code: "AZN",
    name: "Azerbaijani Manat",
    nameBn: "আজারবাইজানি মানাত",
    fractionDigits: 2,
  },
  // 056
  {
    code: "BAM",
    name: "Bosnia and Herzegovina Convertible Mark",
    nameBn: "বসনিয়া ও হার্জেগোভিনার কনভার্টিবল মার্ক",
    fractionDigits: 2,
  },
  // 057
  {
    code: "BBD",
    name: "Barbadian Dollar",
    nameBn: "বার্বাডোস ডলার",
    fractionDigits: 2,
  },
  // 058
  {
    code: "BIF",
    name: "Burundian Franc",
    nameBn: "বুরুন্ডির ফ্রাঁ",
    fractionDigits: 0,
  },
  // 059
  {
    code: "BMD",
    name: "Bermudian Dollar",
    nameBn: "বারমুডীয় ডলার",
    fractionDigits: 2,
  },
  // 060
  {
    code: "BND",
    name: "Brunei Dollar",
    nameBn: "ব্রুনেই ডলার",
    fractionDigits: 2,
  },
  // 061
  {
    code: "BOB",
    name: "Bolivian Boliviano",
    nameBn: "বলিভীয় বলিভিয়ানো",
    fractionDigits: 2,
  },
  // 062
  {
    code: "BSD",
    name: "Bahamian Dollar",
    nameBn: "বাহামীয় ডলার",
    fractionDigits: 2,
  },
  // 063
  {
    code: "BTN",
    name: "Bhutanese Ngultrum",
    nameBn: "ভুটানি গুলট্রাম",
    fractionDigits: 2,
  },
  // 064
  {
    code: "BWP",
    name: "Botswana Pula",
    nameBn: "বতসোয়ানার পুলা",
    fractionDigits: 2,
  },
  // 065
  {
    code: "BZD",
    name: "Belize Dollar",
    nameBn: "বেলিজ ডলার",
    fractionDigits: 2,
  },
  // 066
  {
    code: "CDF",
    name: "Congolese Franc",
    nameBn: "কঙ্গোলীয় ফ্রাঁ",
    fractionDigits: 2,
  },
  // 067
  {
    code: "CRC",
    name: "Costa Rican Colon",
    nameBn: "কোস্টারিকান কোলন",
    fractionDigits: 2,
  },
  // 068
  {
    code: "CVE",
    name: "Cabo Verde Escudo",
    nameBn: "কাবো ভার্দের এস্কুডো",
    fractionDigits: 2,
  },
  // 069
  {
    code: "CZK",
    name: "Czech Koruna",
    nameBn: "চেক কোরুনা",
    fractionDigits: 2,
  },
  // 070
  {
    code: "DJF",
    name: "Djiboutian Franc",
    nameBn: "জিবুতির ফ্রাঁ",
    fractionDigits: 0,
  },
  // 071
  {
    code: "DOP",
    name: "Dominican Peso",
    nameBn: "ডোমিনিকান পেসো",
    fractionDigits: 2,
  },
  // 072
  {
    code: "DZD",
    name: "Algerian Dinar",
    nameBn: "আলজেরীয় দিনার",
    fractionDigits: 2,
  },
  // 073
  {
    code: "ETB",
    name: "Ethiopian Birr",
    nameBn: "ইথিওপীয় বির",
    fractionDigits: 2,
  },
  // 074
  {
    code: "FJD",
    name: "Fijian Dollar",
    nameBn: "ফিজীয় ডলার",
    fractionDigits: 2,
  },
  // 075
  {
    code: "GEL",
    name: "Georgian Lari",
    nameBn: "জর্জীয় লারি",
    fractionDigits: 2,
  },
  // 076
  {
    code: "GTQ",
    name: "Guatemalan Quetzal",
    nameBn: "গুয়াতেমালার কেতসাল",
    fractionDigits: 2,
  },
  // 077
  {
    code: "GYD",
    name: "Guyanese Dollar",
    nameBn: "গায়ানার ডলার",
    fractionDigits: 2,
  },
  // 078
  {
    code: "HNL",
    name: "Honduran Lempira",
    nameBn: "হন্ডুরাসের লেম্পিরা",
    fractionDigits: 2,
  },
  // 079
  {
    code: "HUF",
    name: "Hungarian Forint",
    nameBn: "হাঙ্গেরীয় ফরিন্ট",
    fractionDigits: 2,
  },
  // 080
  {
    code: "ISK",
    name: "Icelandic Krona",
    nameBn: "আইসল্যান্ডীয় ক্রোনা",
    fractionDigits: 0,
  },
  // 081
  {
    code: "JMD",
    name: "Jamaican Dollar",
    nameBn: "জ্যামাইকান ডলার",
    fractionDigits: 2,
  },
  // 082
  {
    code: "KGS",
    name: "Kyrgyzstani Som",
    nameBn: "কিরগিজস্তানি সোম",
    fractionDigits: 2,
  },
  // 083
  {
    code: "KHR",
    name: "Cambodian Riel",
    nameBn: "কম্বোডীয় রিয়েল",
    fractionDigits: 2,
  },
  // 084
  {
    code: "KZT",
    name: "Kazakhstani Tenge",
    nameBn: "কাজাখস্তানি তেঙ্গে",
    fractionDigits: 2,
  },
  // 085
  {
    code: "LAK",
    name: "Lao Kip",
    nameBn: "লাও কিপ",
    fractionDigits: 2,
  },
  // 086
  {
    code: "LBP",
    name: "Lebanese Pound",
    nameBn: "লেবাননি পাউন্ড",
    fractionDigits: 2,
  },
  // 087
  {
    code: "LRD",
    name: "Liberian Dollar",
    nameBn: "লাইবেরীয় ডলার",
    fractionDigits: 2,
  },
  // 088
  {
    code: "MDL",
    name: "Moldovan Leu",
    nameBn: "মলদোভার লেউ",
    fractionDigits: 2,
  },
  // 089
  {
    code: "MGA",
    name: "Malagasy Ariary",
    nameBn: "মাদাগাস্কারের আরিয়ারি",
    fractionDigits: 2,
  },
  // 090
  {
    code: "MKD",
    name: "Macedonian Denar",
    nameBn: "ম্যাসেডোনীয় দেনার",
    fractionDigits: 2,
  },
  // 091
  {
    code: "MMK",
    name: "Myanmar Kyat",
    nameBn: "মিয়ানমারের কিয়াত",
    fractionDigits: 2,
  },
  // 092
  {
    code: "MNT",
    name: "Mongolian Tugrik",
    nameBn: "মঙ্গোলীয় তুগ্রিক",
    fractionDigits: 2,
  },
  // 093
  {
    code: "MUR",
    name: "Mauritian Rupee",
    nameBn: "মরিশাসের রুপি",
    fractionDigits: 2,
  },
  // 094
  {
    code: "MVR",
    name: "Maldivian Rufiyaa",
    nameBn: "মালদ্বীপের রুফিয়া",
    fractionDigits: 2,
  },
  // 095
  {
    code: "MWK",
    name: "Malawian Kwacha",
    nameBn: "মালাউইয়ের কোয়াচা",
    fractionDigits: 2,
  },
  // 096
  {
    code: "MZN",
    name: "Mozambican Metical",
    nameBn: "মোজাম্বিকের মেটিকাল",
    fractionDigits: 2,
  },
  // 097
  {
    code: "NAD",
    name: "Namibian Dollar",
    nameBn: "নামিবীয় ডলার",
    fractionDigits: 2,
  },
  // 098
  {
    code: "RON",
    name: "Romanian Leu",
    nameBn: "রোমানীয় লেউ",
    fractionDigits: 2,
  },
  // 099
  {
    code: "RSD",
    name: "Serbian Dinar",
    nameBn: "সার্বীয় দিনার",
    fractionDigits: 2,
  },
  // 100
  {
    code: "RWF",
    name: "Rwandan Franc",
    nameBn: "রুয়ান্ডার ফ্রাঁ",
    fractionDigits: 0,
  },
] as const satisfies readonly CurrencyDefinition[];

// ------------------------------------------------------------
// Public types and defaults
// ------------------------------------------------------------

export type CurrencyCode =
  (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const SUPPORTED_CURRENCY_COUNT: number =
  SUPPORTED_CURRENCIES.length;

// Used as the initial selection for new templates.
// Changing this does not update existing workbooks.
export const DEFAULT_CURRENCY: CurrencyCode = "BDT";

export const DEFAULT_NUMBER_LOCALE = "en-US";

export const CURRENCY_FORMAT_NOTICE =
  "শুধু মুদ্রার প্রদর্শন পরিবর্তন হবে। সংখ্যা ও হিসাব " +
  "অপরিবর্তিত থাকবে। এটি মুদ্রা রূপান্তর নয়।";

export interface CurrencyOption {
  value: CurrencyCode;
  label: string;
}

export interface MonetaryCellFormat {
  numberFormat: "currency";
  currencyCode: CurrencyCode;
  decimals: number;
}

export interface CurrencyDisplayOptions {
  locale?: string;
  currencyDisplay?: "code" | "symbol" | "name";
  useGrouping?: boolean;
}

// ------------------------------------------------------------
// Currency validation
// ------------------------------------------------------------

// Strict check:
// "USD" is accepted.
// "usd" and " USD " are rejected.
// Use parseCurrencyCode for normalized user input.
export const isCurrencyCode = (
  value: unknown
): value is CurrencyCode => {
  return (
    typeof value === "string" &&
    SUPPORTED_CURRENCIES.some(
      (currency) => currency.code === value
    )
  );
};

// Normalize user input and validate against supported codes.
// Unsupported or non-string input returns null.
export const parseCurrencyCode = (
  value: unknown
): CurrencyCode | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  return isCurrencyCode(normalized) ? normalized : null;
};

// Reject unsupported runtime values.
// No silent fallback is used to relabel financial data.
//
// Return a separate object to prevent callers from mutating
// the shared definition through this helper.
export const getCurrencyDefinition = (
  code: CurrencyCode
): CurrencyDefinition => {
  const definition = SUPPORTED_CURRENCIES.find(
    (currency) => currency.code === code
  );

  if (!definition) {
    throw new RangeError(
      `Unsupported ALIMXL currency code: ${String(code)}`
    );
  }

  return {
    code: definition.code,
    name: definition.name,
    nameBn: definition.nameBn,
    fractionDigits: definition.fractionDigits,
  };
};

// ------------------------------------------------------------
// Template dropdown options
// ------------------------------------------------------------

export const getCurrencyOptions = (
  language: "bn" | "en" = "bn"
): CurrencyOption[] => {
  return SUPPORTED_CURRENCIES.map((currency) => ({
    value: currency.code,
    label:
      language === "bn"
        ? `${currency.code} — ${currency.nameBn}`
        : `${currency.code} — ${currency.name}`,
  }));
};

// Search supported currencies by code or currency name.
// An empty query returns all supported options.
export const searchCurrencyOptions = (
  query: string,
  language: "bn" | "en" = "bn"
): CurrencyOption[] => {
  const normalizedQuery = query.trim().toLowerCase();

  const matches = SUPPORTED_CURRENCIES.filter((currency) => {
    if (!normalizedQuery) {
      return true;
    }

    return (
      currency.code.toLowerCase().includes(normalizedQuery) ||
      currency.name.toLowerCase().includes(normalizedQuery) ||
      currency.nameBn.includes(normalizedQuery)
    );
  });

  return matches.map((currency) => ({
    value: currency.code,
    label:
      language === "bn"
        ? `${currency.code} — ${currency.nameBn}`
        : `${currency.code} — ${currency.name}`,
  }));
};

// ------------------------------------------------------------
// Monetary cell-format settings
//
// These properties match the currency-related CellStyle fields.
// No import from built-in-templates.ts is required.
// ------------------------------------------------------------

export const getMonetaryCellFormat = (
  code: CurrencyCode
): MonetaryCellFormat => {
  const definition = getCurrencyDefinition(code);

  return {
    numberFormat: "currency",
    currencyCode: code,
    decimals: definition.fractionDigits,
  };
};

// ------------------------------------------------------------
// Display formatting
//
// Suitable for:
// - Template labels.
// - Headings.
// - Currency previews.
//
// Do not store this formatted text in place of numeric values
// or formula expressions.
//
// Decimal settings are explicit, so the runtime's default
// currency precision is not used.
//
// Formatting may round the displayed text.
// It does not modify the source numeric value.
//
// Invalid locales or unavailable Intl support can cause the
// JavaScript runtime to throw an error.
// ------------------------------------------------------------

export const formatCurrencyAmount = (
  value: number,
  code: CurrencyCode,
  options: CurrencyDisplayOptions = {}
): string => {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      "Currency display requires a finite numeric value."
    );
  }

  const definition = getCurrencyDefinition(code);

  const formatter = new Intl.NumberFormat(
    options.locale ?? DEFAULT_NUMBER_LOCALE,
    {
      style: "currency",
      currency: code,
      currencyDisplay: options.currencyDisplay ?? "code",
      useGrouping: options.useGrouping ?? true,
      minimumFractionDigits: definition.fractionDigits,
      maximumFractionDigits: definition.fractionDigits,
    }
  );

  return formatter.format(value);
};