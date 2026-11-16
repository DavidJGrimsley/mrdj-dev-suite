// Home pricing copy. Free stays unnumbered; Premium carries unlimited sessions.
// Pro is not a tier. Bullets only name behavior this prototype actually shows.

export interface PricingTier {
  name: string;
  price: string;
  cadence?: string;
  blurb: string;
  bullets: string[];
  cta: string;
  featured?: boolean;
}

export const HOME_PRICING_REPLY =
  "You can review plans on the pricing page — Free to get going, Premium for unlimited sessions, or Team/Enterprise for your org.";

export const PERSONAL_TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "/mo",
    blurb: "Explore the agentic IDE",
    cta: "Start free",
    bullets: [
      "Limited number of active sessions",
      "Infie orchestration (basic)",
      "Community Library access",
      "Local emulators",
    ],
  },
  {
    name: "Premium",
    price: "$100",
    cadence: "/mo",
    blurb: "For serious solo builders",
    featured: true,
    cta: "Choose Premium",
    bullets: [
      "Unlimited sessions",
      "Optional Session Completion Forms",
      "Full Infie orchestration",
      "Private Library",
    ],
  },
];

export const BUSINESS_TIERS: PricingTier[] = [
  {
    name: "Team",
    price: "$500",
    cadence: "/mo",
    blurb: "Shared orchestration for squads",
    featured: true,
    cta: "Choose Team",
    bullets: [
      "Everything in Premium",
      "Up to 10 seats",
      "Shared Library",
      "Org-wide project memory",
    ],
  },
  {
    name: "Enterprise",
    price: "Contact us",
    blurb: "Scale across your org",
    cta: "Contact sales",
    bullets: [
      "Unlimited seats",
      "SSO / SAML",
      "Dedicated infrastructure",
      "Security review + audit logs",
      "SLA + solutions engineering",
    ],
  },
];

export function tierNames(tiers: PricingTier[]): string[] {
  return tiers.map((tier) => tier.name);
}
