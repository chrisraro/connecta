import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StorefrontView } from "./StorefrontView";
import type { ProfileData } from "@/types/profile";

/**
 * The API now rejects visitor lead submissions without consent (L-8). This
 * asserts StorefrontView's inquiry form — the Storefront tab's own lead
 * capture, separate from SurveyLeadForm — carries the same required consent
 * checkbox and sends `consent: true` in the /api/leads payload, and that Send
 * is disabled until it's ticked.
 */

const fetchMock = vi.fn();

function renderStorefront() {
  const data: ProfileData = {
    ownerId: "owner_1",
    name: "Test Profile",
    profileType: "individual",
    agent: {
      fullName: "Maria Santos",
      title: "Real Estate Agent",
      company: "",
      email: "",
      phone: "",
      website: "",
      about: "",
      avatarUrl: undefined,
      services: [],
      socialLinks: [],
    } as ProfileData["agent"],
    properties: [],
    projects: [],
    products: [
      {
        title: "Sample product",
        description: "A sample product for sale.",
        price: 500,
      },
    ],
    services: [],
    propertyListings: [],
    inlineProjects: [],
    componentOrder: [],
    theme: {
      primaryColor: "#000",
      backgroundColor: "#fff",
      textColor: "#000",
      secondaryColor: "#000",
      accentColor: "#000",
    },
    digitalCard: undefined,
    showStorefront: true,
  };

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <StorefrontView data={data} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal("fetch", fetchMock);
});

describe("StorefrontView inquiry form", () => {
  test("Send is disabled until consent is ticked, and the payload includes consent: true", async () => {
    renderStorefront();

    fireEvent.click(screen.getByRole("button", { name: /sample product/i }));
    fireEvent.click(await screen.findByRole("button", { name: /inquire via lead form/i }));

    const nameInput = await screen.findByLabelText(/your name/i);
    fireEvent.change(nameInput, { target: { value: "Juan Dela Cruz" } });
    const contactInput = screen.getByLabelText(/your email or mobile phone/i);
    fireEvent.change(contactInput, { target: { value: "juan@example.com" } });

    const sendButton = screen.getByRole("button", { name: /send inquiry/i });
    expect(sendButton).toBeDisabled();

    const consentCheckbox = screen.getByRole("checkbox");
    fireEvent.click(consentCheckbox);
    expect(sendButton).not.toBeDisabled();

    fireEvent.click(sendButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/leads", expect.anything()));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.consent).toBe(true);
    expect(body.owner_id).toBe("owner_1");
  });

  test("the consent copy links the Privacy Policy phrase to /privacy#lead-data", async () => {
    renderStorefront();

    fireEvent.click(screen.getByRole("button", { name: /sample product/i }));
    fireEvent.click(await screen.findByRole("button", { name: /inquire via lead form/i }));

    const link = await screen.findByRole("link", { name: /privacy policy/i });
    expect(link).toHaveAttribute("href", "/privacy#lead-data");
  });
});
