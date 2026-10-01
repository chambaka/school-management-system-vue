export const DEFAULT_NATIONALITY = "Tanzanian";

export const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Antiguan", "Argentine",
  "Armenian", "Australian", "Austrian", "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi",
  "Barbadian", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese", "Bolivian",
  "Bosnian", "Botswanan", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabe", "Burmese",
  "Burundian", "Cambodian", "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian",
  "Chilean", "Chinese", "Colombian", "Comorian", "Congolese", "Costa Rican", "Croatian", "Cuban",
  "Cypriot", "Czech", "Danish", "Djiboutian", "Dominican", "Dutch", "East Timorese", "Ecuadorean",
  "Egyptian", "Emirati", "Equatorial Guinean", "Eritrean", "Estonian", "Ethiopian", "Fijian",
  "Filipino", "Finnish", "French", "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek",
  "Grenadian", "Guatemalan", "Guinean", "Guyanese", "Haitian", "Honduran", "Hungarian", "Icelandic",
  "Indian", "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli", "Italian", "Ivorian", "Jamaican",
  "Japanese", "Jordanian", "Kazakh", "Kenyan", "Kiribati", "Korean", "Kosovar", "Kuwaiti",
  "Kyrgyz", "Lao", "Latvian", "Lebanese", "Liberian", "Libyan", "Liechtensteiner", "Lithuanian",
  "Luxembourgish", "Macedonian", "Malagasy", "Malawian", "Malaysian", "Maldivian", "Malian",
  "Maltese", "Marshallese", "Mauritanian", "Mauritian", "Mexican", "Micronesian", "Moldovan",
  "Monacan", "Mongolian", "Montenegrin", "Moroccan", "Mozambican", "Namibian", "Nauruan", "Nepali",
  "New Zealander", "Nicaraguan", "Nigerien", "Nigerian", "North Korean", "Norwegian", "Omani",
  "Pakistani", "Palauan", "Palestinian", "Panamanian", "Papua New Guinean", "Paraguayan", "Peruvian",
  "Polish", "Portuguese", "Qatari", "Romanian", "Russian", "Rwandan", "Saint Lucian", "Salvadoran",
  "Samoan", "Saudi", "Scottish", "Senegalese", "Serbian", "Seychellois", "Sierra Leonean",
  "Singaporean", "Slovak", "Slovenian", "Solomon Islander", "Somali", "South African", "South Korean",
  "South Sudanese", "Spanish", "Sri Lankan", "Sudanese", "Surinamese", "Swazi", "Swedish", "Swiss",
  "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai", "Togolese", "Tongan", "Trinidadian",
  "Tunisian", "Turkish", "Turkmen", "Tuvaluan", "Ugandan", "Ukrainian", "Uruguayan", "Uzbek",
  "Vanuatuan", "Venezuelan", "Vietnamese", "Welsh", "Yemeni", "Zambian", "Zimbabwean",
];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const INSURANCE_PROVIDERS = [
  "AAR Insurance",
  "Alliance Insurance",
  "Alliance Life Assurance",
  "Assemble Insurance",
  "Britam Insurance",
  "GA Insurance",
  "Heritage Insurance",
  "iCHF",
  "ICEA Lion Insurance",
  "Jubilee Health Insurance",
  "Maxinsure",
  "Milembe Insurance",
  "MO Assurance",
  "National Insurance Corporation",
  "NHIF",
  "NSSF",
  "Sanlam General Insurance",
  "Strategis Insurance",
  "Zanzibar Insurance Corporation",
];

const EXTRA_INSURANCE_KEY = "shulehub.insurance-providers";

export function loadExtraInsuranceProviders() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EXTRA_INSURANCE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((name) => String(name || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function rememberInsuranceProvider(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  const known = INSURANCE_PROVIDERS.find((provider) => provider.toLowerCase() === trimmed.toLowerCase());
  if (known) return known;
  const extras = loadExtraInsuranceProviders();
  const existing = extras.find((provider) => provider.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  extras.push(trimmed);
  try {
    localStorage.setItem(EXTRA_INSURANCE_KEY, JSON.stringify(extras));
  } catch {
    /* the name is still used on this student */
  }
  return trimmed;
}

export function splitEmergency(value) {
  const text = String(value || "").trim();
  const mark = " · ";
  const at = text.indexOf(mark);
  if (at === -1) return { name: text, phone: "" };
  return { name: text.slice(0, at), phone: text.slice(at + mark.length) };
}

export function joinEmergency(name, phone) {
  const person = String(name || "").trim();
  const number = String(phone || "").trim();
  if (person && number) return `${person} · ${number}`;
  return person || number;
}
