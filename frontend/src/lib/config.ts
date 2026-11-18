export const CONTACT_EMAIL = "contact@leadmindset.org";

export type SocialKey = "instagram" | "linkedin" | "slack";

export const SOCIALS: { key: SocialKey; name: string; handle: string; href: string }[] = [
  {
    key: "instagram",
    name: "Instagram",
    handle: "@lead_americas",
    href: "https://www.instagram.com/lead_americas/",
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    handle: "LEAD",
    href: "https://www.linkedin.com/company/leadmindsetorg/",
  },
  {
    key: "slack",
    name: "Slack",
    handle: "LEAD Workspace",
    href: "https://join.slack.com/t/leadmindsetworkspace/shared_invite/zt-3k9782iqo-lm1xNxkptWdSbkkXOR5mvg",
  },
];

export function getSocial(key: SocialKey) {
  const social = SOCIALS.find((item) => item.key === key);
  if (!social) throw new Error(`Unknown social: ${key}`);
  return social;
}
