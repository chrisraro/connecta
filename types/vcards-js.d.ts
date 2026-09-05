declare module "vcards-js" {
  interface VCard {
    firstName: string;
    lastName: string;
    organization: string;
    title: string;
    email: string | string[];
    workEmail: string | string[];
    homeEmail: string | string[];
    cellPhone: string | string[];
    workPhone: string | string[];
    homePhone: string | string[];
    workUrl: string;
    homeUrl: string;
    socialUrls: Record<string, string>;
    getFormattedString(): string;
  }

  function vCard(): VCard;
  export = vCard;
}
