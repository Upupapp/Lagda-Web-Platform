// Entity extraction for the LAGDA Chatbot: names, companies, dates, amounts,
// job titles and durations, read straight from what the person typed.
// Regex and word lists only — nothing leaves the browser.

const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";

const COMPANY_SUFFIX = "(?:Inc\\.?|Incorporated|Corp\\.?|Corporation|Co\\.|Company|LLC|L\\.L\\.C\\.|Ltd\\.?|Limited|Enterprises?|Holdings|Group|Partners|Foundation|Cooperative|Coop|OPC|Trading|Industries|Solutions|Services|Technologies|Tech|Ventures|Bank|University|College|School|Hospital|Clinic|Agency)";

export interface Entities {
  names: string[];
  companies: string[];
  dates: string[];
  amounts: string[];
  jobTitle?: string;
  term?: string;
  /** "between X and Y" — the two sides, in order, whatever they are. */
  between?: [string, string];
}

const JOB_WORDS = "manager|engineer|developer|programmer|officer|assistant|analyst|designer|director|supervisor|specialist|coordinator|consultant|accountant|clerk|secretary|nurse|teacher|driver|technician|representative|associate|administrator|architect|lawyer|counsel|executive|intern|agent|cashier|staff|lead|head|president|vice president|ceo|cfo|coo|cto|writer|editor|marketer|salesperson|operator|guard|chef|cook|helper|trainee";

const JOB_TAIL = new RegExp(`\\b(?:${JOB_WORDS})$`, "i");
const COMPANY_TAIL = new RegExp(`${COMPANY_SUFFIX}$`);

function clean(s: string): string {
  return s.replace(/^[\s,.;:"'“”‘’]+|[\s,;:"'“”‘’]+$/g, "").replace(/\s+/g, " ");
}

/** "₱50,000", "PHP 1.2 million", "50k pesos", "$3,000", "5% of net sales". */
export function extractAmounts(text: string): string[] {
  const out: string[] = [];
  const re = /(?:(?:₱|PHP|Php|php|P(?=\s?\d)|\$|USD|US\$)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|K|m|M|million|thousand|billion)\b)?|\b\d[\d,]*(?:\.\d+)?\s?(?:k|K|million|thousand|billion)?\s?(?:pesos?|php|dollars?|usd)\b|\b\d{1,3}(?:\.\d+)?\s?%(?:\s(?:of\s)?[a-z ]{0,20}?(?:sales|revenue|profits?|income))?)(?:\s?(?:per|a|\/)\s?(?:month|year|annum|hour|day|week|trip|kilo|kg|term|semester))?/g;
  for (const m of text.matchAll(re)) out.push(clean(m[0]));
  if (out.length === 0) {
    const bare = /\b(\d+(?:\.\d+)?\s?(?:k|K|million))\b/.exec(text);
    if (bare) out.push(bare[1]!);
  }
  return out;
}

/** "March 1, 2027", "1 March 2027", "2027-03-01", "03/01/2027", "today". */
export function extractDates(text: string): string[] {
  const out: string[] = [];
  const patterns = [
    new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b`, "gi"),
    new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${MONTHS})\\.?(?:,?\\s+\\d{4})?\\b`, "gi"),
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\b(?:today|tomorrow|next (?:monday|tuesday|wednesday|thursday|friday|week|month))\b/gi,
  ];
  for (const re of patterns) for (const m of text.matchAll(re)) out.push(clean(m[0]));
  if (out.length === 0) {
    const my = new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{4}\\b`, "i").exec(text);
    if (my) out.push(clean(my[0]));
  }
  return out;
}

/** "for 2 years", "6 months", "one year". */
export function extractTerm(text: string): string | undefined {
  const m = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|eighteen|twenty[- ]four|thirty|sixty|ninety)\s*(?:\(\d+\)\s*)?(day|week|month|year)s?\b/i.exec(text);
  if (!m) return undefined;
  const n = m[1]!.toLowerCase();
  const unit = m[2]!.toLowerCase();
  const plural = n === "1" || n === "one" ? unit : `${unit}s`;
  return `${n} ${plural}`;
}

function titleWords(s: string): string {
  const acronyms = new Set(["hr", "it", "ceo", "cfo", "coo", "cto", "qa", "ui", "ux", "r&d"]);
  return s.trim().split(/\s+/).map(w => acronyms.has(w.toLowerCase()) ? w.toUpperCase()
    : w === w.toUpperCase() && w.length <= 4 ? w
    : w[0]!.toUpperCase() + w.slice(1)).join(" ");
}

/** "as a Senior Developer", "position of HR Officer", "hire a nurse". */
export function extractJobTitle(text: string): string | undefined {
  const explicit = /\b(?:as (?:an? |the |our )?|position of |role of |job title (?:is |of )?|position is |role is |post of |for the (?:position|role) of )([A-Za-z][A-Za-z&/\- ]{1,48}?)(?=$|[,.;]| (?:at|with|for|starting|from|on|to|and|but|who|reporting|salary|paid|effective)\b)/i.exec(text);
  const jobRe = new RegExp(`\\b(${JOB_WORDS})\\b`, "i");
  if (explicit) {
    const v = explicit[1]!.trim();
    if (jobRe.test(v)) return titleWords(v);
  }
  const hire = new RegExp(`\\b(?:hire|hiring|hired|offer(?:ing)?)\\s+(?:an? |the |our |new )?((?:[a-z]+ ){0,2}(?:${JOB_WORDS}))\\b`, "i").exec(text);
  if (hire) return titleWords(hire[1]!);
  return undefined;
}

export function extractCompanies(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`\\b((?:[A-Z0-9][\\w&'’.-]*\\s+){0,4}${COMPANY_SUFFIX})(?=$|[\\s,;:)])`, "g");
  for (const m of text.matchAll(re)) {
    let v = clean(m[1]!);
    v = v.replace(/^(?:Between|And|With|For|At|By|From|To|The)\s+/, "");
    if (v.split(" ").length >= 2 || /[A-Z]{2,}/.test(v)) out.push(v);
  }
  return [...new Set(out)];
}

const NAME_STOP = new Set([
  "I", "I'm", "Hi", "Hello", "Hey", "Please", "Create", "Write", "Draft", "Make", "Generate", "Add", "The", "A", "An", "Can", "Could",
  "Would", "Should", "My", "Our", "Their", "This", "That", "It", "We", "You", "He", "She", "They", "Also", "Then", "And", "But",
  "Yes", "No", "Okay", "Ok", "Sure", "Thanks", "Thank", "NDA", "SLA", "DPA", "MOU", "MOA", "HR", "IT", "Agreement", "Contract",
  "Employment", "Lease", "Offer", "Letter", "Form", "Philippines", "Manila", "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday", "January", "February", "March", "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "Signed", "Approved", "Reviewed", "Remove", "Change", "Delete", "Include", "Mr", "Ms",
  "Mrs", "Dr", "Atty", "Engr", "Start", "Starting", "Effective", "Salary", "Position", "Company", "Employer", "Employee",
  "Candidate", "Tenant", "Landlord", "Client", "Customer", "Vendor", "Supplier", "Seller", "Buyer", "Lessor", "Lessee",
]);

/**
 * Person names: two to five capitalised words, allowing Filipino particles
 * ("Dela Cruz", "de los Santos"), "Ma." and suffixes ("Jr.", "III"), or
 * anything in quotes.
 */
export function extractNames(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/["“']([^"”']{2,60})["”']/g)) out.push(clean(m[1]!));
  const word = "(?:Ma\\.|Sta\\.|Sto\\.|[A-ZÑ][a-zñ'’-]+|[A-Z]\\.)";
  const particle = "(?:de la|de los|de las|dela|della|delos|delas|del|de|san|y|van|von|da|dos|di|De La|De Los|Dela|Del|De|Delos|San)";
  const suffix = "(?:,?\\s(?:Jr\\.?|Sr\\.?|III|II|IV|VI|V)\\b)";
  const honorific = "(?:(?:Mr|Mrs|Ms|Dr|Atty|Engr|Arch|Hon|Prof)\\.?\\s)";
  const re = new RegExp(`${honorific}?${word}(?:\\s(?:${particle}\\s)?${word}){1,4}${suffix}?`, "g");
  for (const m of text.matchAll(re)) {
    const v = clean(m[0]).replace(/,$/, "");
    const parts = v.split(/\s+/);
    if (parts.every(p => NAME_STOP.has(p.replace(/[.,]$/, "")))) continue;
    while (parts.length > 0 && NAME_STOP.has(parts[0]!.replace(/[.,]$/, ""))) parts.shift();
    while (parts.length > 0 && NAME_STOP.has(parts[parts.length - 1]!.replace(/[.,]$/, ""))) parts.pop();
    if (parts.length >= 2 || (parts.length === 1 && /^[A-ZÑ][a-zñ]{2,}$/.test(parts[0]!) && m.index !== 0)) {
      const name = parts.join(" ");
      if (!COMPANY_TAIL.test(name) && !JOB_TAIL.test(name)) out.push(name);
    }
  }
  return [...new Set(out)];
}

export function extractBetween(text: string): [string, string] | undefined {
  const m = /\bbetween\s+(.+?)\s+(?:and|&)\s+(.+?)(?=$|[,.;]\s|[,;]|\s(?:for|starting|effective|on|at a|with a|who|to be|signed|approved|reviewed|as|about|regarding|covering)\b)/i.exec(text);
  if (!m) return undefined;
  const a = clean(m[1]!).replace(/^(?:the|a|an)\s+/i, "");
  const b = clean(m[2]!).replace(/^(?:the|a|an)\s+/i, "");
  if (a === "" || b === "" || a.length > 60 || b.length > 60) return undefined;
  return [a, b];
}

export function extractEntities(text: string): Entities {
  const companies = extractCompanies(text);
  const names = extractNames(text).filter(n => !companies.some(c => c.includes(n)));
  const between = extractBetween(text);
  const jobTitle = extractJobTitle(text);
  const term = extractTerm(text);
  return {
    names, companies,
    dates: extractDates(text),
    amounts: extractAmounts(text),
    ...(jobTitle !== undefined ? { jobTitle } : {}),
    ...(term !== undefined ? { term } : {}),
    ...(between !== undefined ? { between } : {}),
  };
}

/** Today as "March 1, 2027", for the “Today” chip. */
export function formatToday(now: Date = new Date()): string {
  return now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
