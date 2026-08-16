import { cn } from "@/lib/utils";

describe("cn utility function", () => {
  it("merges class names correctly", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "conditional")).toBe("base conditional");
    expect(cn("base", false && "conditional")).toBe("base");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });

  it("merges Tailwind classes correctly", () => {
    expect(cn("p-4 p-2")).toBe("p-2"); // Last one wins
  });
});

