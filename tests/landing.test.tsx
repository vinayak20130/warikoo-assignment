import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SkillPathLanding from "@/components/skillpath/SkillPathLanding";

const COURSES = [
  {
    courseName: "How To YouTube",
    courseCode: "how-to-youtube",
    description: "From concept to creation, learn how to build and grow a channel.",
    mainCategory: "Content Creation",
    shortCourse: "YouTube",
    courseType: "Original",
    pricePaise: 199900,
    priceUsdCents: 3999,
    mangoId: "a1b2c3d4e5f6789012345678",
    refundable: true,
  },
  {
    courseName: "Notion Second Brain",
    courseCode: "notion-second-brain",
    description: "Build a personal knowledge system in Notion.",
    mainCategory: "Productivity",
    shortCourse: "Notion",
    courseType: "Original",
    pricePaise: 79900,
    priceUsdCents: 1499,
    mangoId: "e5f67890123456789abcdef0",
    refundable: true,
  },
];

interface Routes {
  courses?: () => Promise<Response> | Response;
  country?: () => Promise<Response> | Response;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function mockApi(routes: Routes) {
  const fetchMock = vi.fn((url: string) => {
    if (url.includes("course-data")) {
      return Promise.resolve(routes.courses?.() ?? json(COURSES));
    }
    return Promise.resolve(routes.country?.() ?? json({ country_code: "IN" }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the working state", () => {
  it("renders a card per course with its name, description, category and price", async () => {
    mockApi({});

    render(<SkillPathLanding />);

    expect(await screen.findByText("How To YouTube")).toBeInTheDocument();
    expect(screen.getByText("Notion Second Brain")).toBeInTheDocument();
    expect(screen.getByText(/From concept to creation/)).toBeInTheDocument();
    expect(screen.getByText("Content Creation")).toBeInTheDocument();
    expect(screen.getByText("Productivity")).toBeInTheDocument();
    expect(screen.getByText("₹1,999")).toBeInTheDocument();
    expect(screen.getByText("₹799")).toBeInTheDocument();
  });

  it("does not assume a fixed number of cards", async () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({
      ...COURSES[0],
      courseCode: `course-${i}`,
      courseName: `Course ${i}`,
    }));
    mockApi({ courses: () => json(seven) });

    render(<SkillPathLanding />);

    await screen.findByText("Course 0");
    expect(screen.getByText("7 courses available now")).toBeInTheDocument();
  });

  it("shows the hero and the three footer links", async () => {
    mockApi({});

    render(<SkillPathLanding />);

    expect(
      screen.getByRole("heading", { name: /Short courses that end in something you built/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse courses/ })).toBeInTheDocument();
    for (const label of ["About", "Contact", "Refund policy"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});

describe("pricing", () => {
  it("prices in rupees for India", async () => {
    mockApi({ country: () => json({ country_code: "IN" }) });

    render(<SkillPathLanding />);

    expect(await screen.findByText("₹1,999")).toBeInTheDocument();
    expect(screen.queryByText("$39.99")).not.toBeInTheDocument();
  });

  it("prices in dollars for the US", async () => {
    mockApi({ country: () => json({ country_code: "US" }) });

    render(<SkillPathLanding />);

    expect(await screen.findByText("$39.99")).toBeInTheDocument();
    expect(screen.getByText("$14.99")).toBeInTheDocument();
    expect(screen.queryByText("₹1,999")).not.toBeInTheDocument();
  });

  it("asks the flipping endpoint exactly once, so one page never mixes currencies", async () => {
    // The endpoint alternates on every call. Asking per card would produce a
    // grid of rupees and dollars side by side.
    let call = 0;
    const fetchMock = mockApi({
      country: () => json({ country_code: call++ % 2 === 0 ? "IN" : "US" }),
    });

    render(<SkillPathLanding />);
    await screen.findByText("How To YouTube");

    const countryCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("country-code"),
    );
    expect(countryCalls).toHaveLength(1);
    expect(screen.getAllByText(/^₹/)).toHaveLength(2);
  });

  it("still renders the catalogue when only the country lookup fails", async () => {
    mockApi({ country: () => json({ country_code: "??" }) });

    render(<SkillPathLanding />);

    // Falls back to India rather than taking down a page whose courses loaded.
    expect(await screen.findByText("₹1,999")).toBeInTheDocument();
  });
});

describe("the loading state", () => {
  it("shows skeletons until the courses arrive", async () => {
    let release!: (value: Response) => void;
    mockApi({ courses: () => new Promise<Response>((resolve) => (release = resolve)) });

    const { container } = render(<SkillPathLanding />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading courses…")).toBeInTheDocument();
    expect(container.querySelectorAll(".sp-skeleton-card")).toHaveLength(6);

    release(json(COURSES));
    expect(await screen.findByText("How To YouTube")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("the error state", () => {
  it("explains the failure and recovers when the visitor tries again", async () => {
    const user = userEvent.setup();
    let attempt = 0;
    mockApi({
      courses: () => {
        attempt += 1;
        // Four failures exhausts the retry chain; the fifth call is the
        // manual retry and succeeds.
        return attempt <= 4 ? json({ message: "nope" }, 500) : json(COURSES);
      },
    });

    render(<SkillPathLanding />);

    const alert = await screen.findByRole("alert", {}, { timeout: 15_000 });
    expect(alert).toHaveTextContent("Courses didn’t load");
    expect(alert).toHaveTextContent("responded with 500");
    expect(alert).toHaveTextContent("Tried 4 times.");

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("How To YouTube")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  }, 20_000);
});

describe("the empty state", () => {
  it("says nothing is published rather than showing a blank section", async () => {
    mockApi({ courses: () => json([]) });

    render(<SkillPathLanding />);

    expect(await screen.findByText("No courses are published yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
  });

  it("treats a list of unusable entries as empty, not as a crash", async () => {
    mockApi({ courses: () => json([{ courseName: "", pricePaise: null }]) });

    render(<SkillPathLanding />);

    expect(await screen.findByText("No courses are published yet")).toBeInTheDocument();
  });
});

describe("the property controls", () => {
  async function renderRoot(props: Parameters<typeof SkillPathLanding>[0] = {}) {
    mockApi({});
    const { container } = render(<SkillPathLanding {...props} />);
    await screen.findByText("How To YouTube");
    return container.querySelector(".sp-root") as HTMLElement;
  }

  it("paints the cards the colour a designer picks", async () => {
    const root = await renderRoot({ cardColor: "#101418" });

    expect(root.style.getPropertyValue("--sp-card-bg")).toBe("#101418");
  });

  it("flips card text to white on a dark card so it stays readable", async () => {
    const root = await renderRoot({ cardColor: "#101418" });

    expect(root.style.getPropertyValue("--sp-card-ink")).toBe("#FFFFFF");
    // Borders and the badge tint have to come off the card colour too,
    // or they vanish into a dark surface.
    expect(root.style.getPropertyValue("--sp-card-border")).toBe("rgba(255, 255, 255, 0.16)");
    expect(root.style.getPropertyValue("--sp-badge-bg")).toBe("rgba(255, 255, 255, 0.14)");
  });

  it("keeps ink text on a light card", async () => {
    const root = await renderRoot({ cardColor: "#FFF8E1" });

    expect(root.style.getPropertyValue("--sp-card-ink")).toBe("#16191A");
    expect(root.style.getPropertyValue("--sp-card-border")).toBe("#E3E7E3");
  });

  it("leaves the page around the cards alone when the card colour changes", async () => {
    const root = await renderRoot({ cardColor: "#101418" });

    expect(root.style.getPropertyValue("--sp-paper")).toBe("#F7F8F6");
    expect(root.style.getPropertyValue("--sp-ink")).toBe("#16191A");
    expect(root.style.getPropertyValue("--sp-accent")).toBe("#1F4B3F");
  });

  it("lays the grid out with the requested number of cards per row", async () => {
    const root = await renderRoot({ columns: 4 });

    expect(root.style.getPropertyValue("--sp-columns")).toBe("4");
  });

  it("never widens the designer's count on smaller screens", async () => {
    const root = await renderRoot({ columns: 4 });

    expect(root.style.getPropertyValue("--sp-columns-md")).toBe("2");
    expect(root.style.getPropertyValue("--sp-columns-sm")).toBe("1");
  });

  it("does not stretch a single-column choice back out on a tablet", async () => {
    const root = await renderRoot({ columns: 1 });

    expect(root.style.getPropertyValue("--sp-columns-md")).toBe("1");
  });

  it("clamps a count that would not fit", async () => {
    const root = await renderRoot({ columns: 12 });

    expect(root.style.getPropertyValue("--sp-columns")).toBe("4");
  });

  it("falls back to the defaults when no props are given", async () => {
    const root = await renderRoot();

    expect(root.style.getPropertyValue("--sp-card-bg")).toBe("#FFFFFF");
    expect(root.style.getPropertyValue("--sp-columns")).toBe("3");
  });
});

describe("the demo overrides", () => {
  it("forces a state without touching the network", async () => {
    const fetchMock = mockApi({});
    window.history.replaceState({}, "", "/?state=empty");

    render(<SkillPathLanding />);

    expect(await screen.findByText("No courses are published yet")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pins the currency so both markets can be seen on demand", async () => {
    const fetchMock = mockApi({ country: () => json({ country_code: "IN" }) });
    window.history.replaceState({}, "", "/?country=US");

    render(<SkillPathLanding />);

    expect(await screen.findByText("$39.99")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url).includes("country-code")),
      ).toHaveLength(0),
    );
  });
});
