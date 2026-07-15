// Application configuration — frontend-only phase.
// No secrets, tokens, or real API credentials here.

export const APP_CONFIG = {
  name: "LAGDA",
  tagline: "Philippine Legal Document Automation",
  company: "UpUp Technologies",
  domain: "lagda.io",

  paths: {
    public: "/",
    auth: "/sign-in",
    platform: "/app",
    verify: "/verify",
    enotary: "/enotary",
  },

  // Mock mode: all services return mock data. Set to false when real API is wired.
  mockMode: true,

  // Simulated network latency in ms (used by mock services)
  mockDelayMs: 400,

  // Feature flags — control access to in-progress sections
  features: {
    enotaryWaitlist: true,       // Show eNotary waitlist signup
    publicVerification: true,    // Public document verification page (built in C10)
    platformDashboard: false,    // Authenticated platform (not yet built)
    devPlaceholders: true,       // Show dev placeholder pages for unbuilt routes
  },

  // Legal — must never change without legal review
  legal: {
    enotaryDisclaimer:
      "LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.",
    esignatureStatement:
      "LAGDA eSignature helps Philippine professionals and organizations prepare, send, sign, track, verify, and securely manage documents online.",
  },

  // Analytics — off during development
  analytics: {
    enabled: false,
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
