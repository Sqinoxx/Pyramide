import { describe, it, expect } from "vitest";
import { escapeHtml } from "./html-escape";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert('x')&"y"</script>`)).toBe(
      "&lt;script&gt;alert(&#39;x&#39;)&amp;&quot;y&quot;&lt;/script&gt;",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Michael Gruber")).toBe("Michael Gruber");
  });

  it("neutralizes an injected link/tag in a free-text field", () => {
    const malicious = `Nice try <a href="javascript:alert(1)">click</a>`;
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain("<a");
    expect(escaped).toContain("&lt;a href=&quot;javascript:alert(1)&quot;&gt;");
  });
});
