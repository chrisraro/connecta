import { AgentInfo } from "@/types/profile";

export const generateVCardBlob = (agent: AgentInfo): Blob => {
  // Manually construct vCard 3.0 string
  let vcard = "BEGIN:VCARD\nVERSION:3.0\n";

  // Name
  const nameParts = agent.fullName.split(" ");
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const firstName = nameParts[0];
  vcard += `N:${lastName};${firstName};;;\n`;
  vcard += `FN:${agent.fullName}\n`;

  // Org & Title
  if (agent.company) vcard += `ORG:${agent.company}\n`;
  if (agent.title) vcard += `TITLE:${agent.title}\n`;

  // Contact
  if (agent.phone) vcard += `TEL;TYPE=CELL:${agent.phone}\n`;
  if (agent.email) vcard += `EMAIL;TYPE=WORK:${agent.email}\n`;
  if (agent.website) vcard += `URL:${agent.website}\n`;

  // Address (Label)
  if (agent.address) {
    // ADR expects structured data: ;;;Street;City;Region;Zip;Country
    // Since we have a single string, we'll put it in label or street
    vcard += `ADR;TYPE=WORK:;;${agent.address};;;;\n`;
    vcard += `LABEL;TYPE=WORK:${agent.address}\n`;
  }

  // Socials - X-SOCIALPROFILE is often supported, or just URL
  if (agent.socialLinks) {
    agent.socialLinks.forEach((link) => {
      vcard += `URL;type=${link.platform}:${link.url}\n`;
    });
  }

  // Avatar (PHOTO) - skipping for now as it requires base64 fetching which is async/complex for client sync btn
  // We could add it if we want to fetch blob first.

  vcard += "END:VCARD";

  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
  return blob;
};

export const downloadVCard = (agent: AgentInfo) => {
  const blob = generateVCardBlob(agent);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${agent.fullName.replace(/\s+/g, "_")}_contact.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
