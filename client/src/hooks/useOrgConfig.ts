/**
 * useOrgConfig — Hook para acessar configurações institucionais do banco de dados.
 * Fornece logo, nome da organização, cores e demais configurações de identidade visual.
 */
import { trpc } from "@/lib/trpc";

export interface OrgConfig {
  logoUrl: string;
  faviconUrl: string;
  orgName: string;
  orgShortName: string;
  primaryColor: string;
  secondaryColor: string;
  platformName: string;
  footerText: string;
}

const DEFAULTS: OrgConfig = {
  logoUrl: (import.meta.env.VITE_APP_LOGO as string) ?? "",
  faviconUrl: "",
  orgName: (import.meta.env.VITE_APP_TITLE as string) ?? "CAIUS",
  orgShortName: "CAIUS",
  primaryColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  platformName: "Plataforma Omnichannel",
  footerText: "",
};

export function useOrgConfig(): OrgConfig {
  const { data: configs = [] } = trpc.institutionalConfig.get.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache por 5 minutos
  });

  if (!configs || (configs as any[]).length === 0) return DEFAULTS;

  const map: Record<string, string> = {};
  (configs as any[]).forEach((c: any) => {
    if (c.key && c.value) map[c.key] = c.value;
  });

  return {
    logoUrl: map["org_logo_url"] || DEFAULTS.logoUrl,
    faviconUrl: map["org_favicon_url"] || DEFAULTS.faviconUrl,
    orgName: map["org_name"] || DEFAULTS.orgName,
    orgShortName: map["org_short_name"] || DEFAULTS.orgShortName,
    primaryColor: map["org_primary_color"] || DEFAULTS.primaryColor,
    secondaryColor: map["org_secondary_color"] || DEFAULTS.secondaryColor,
    platformName: map["platform_name"] || DEFAULTS.platformName,
    footerText: map["platform_footer_text"] || DEFAULTS.footerText,
  };
}
