import { describe, it, expect } from "vitest";
import { normalizeName, scoreCandidate, classifyMatches } from "./itn-match";

describe("normalizeName", () => {
  it("lowercases and transliterates umlauts", () => {
    expect(normalizeName("Müller", "Jürgen")).toBe("mueller, juergen");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(normalizeName("O'Brien-Schmidt", "Anna  Maria")).toBe(
      "o brien schmidt, anna maria",
    );
  });
});

describe("scoreCandidate", () => {
  const member = {
    lastName: "Gruber",
    firstName: "Michael",
    birthYear: 1988,
    gender: "m" as const,
    club: "UTC Pyramide",
  };

  it("adds bonuses for matching birth year, club, and gender", () => {
    const candidate = {
      itnRecordId: "1",
      lastName: "Gruber",
      firstName: "Michael",
      birthYear: 1988,
      gender: "m" as const,
      club: "UTC Pyramide",
      similarity: 0.9,
    };
    const scored = scoreCandidate(member, candidate);
    expect(scored.score).toBeCloseTo(1.0, 5);
  });

  it("caps the score at 1", () => {
    const candidate = {
      itnRecordId: "1",
      lastName: "Gruber",
      firstName: "Michael",
      birthYear: 1988,
      gender: "m" as const,
      club: "UTC Pyramide",
      similarity: 1,
    };
    expect(scoreCandidate(member, candidate).score).toBe(1);
  });

  it("gives no bonus when metadata doesn't match", () => {
    const candidate = {
      itnRecordId: "1",
      lastName: "Gruber",
      firstName: "Michael",
      birthYear: 1970,
      gender: "w" as const,
      club: "Other Club",
      similarity: 0.6,
    };
    expect(scoreCandidate(member, candidate).score).toBe(0.6);
  });
});

describe("classifyMatches", () => {
  it("returns none for an empty candidate list", () => {
    expect(classifyMatches([]).tier).toBe("none");
  });

  it("classifies a high-confidence, clearly-best match as auto", () => {
    const result = classifyMatches([
      { itnRecordId: "1", lastName: "A", firstName: "B", birthYear: null, gender: null, club: null, similarity: 0.9, score: 0.95 },
      { itnRecordId: "2", lastName: "C", firstName: "D", birthYear: null, gender: null, club: null, similarity: 0.5, score: 0.5 },
    ]);
    expect(result.tier).toBe("auto");
    expect(result.candidates[0].itnRecordId).toBe("1");
  });

  it("falls back to suggest when the top score is high but ambiguous", () => {
    const result = classifyMatches([
      { itnRecordId: "1", lastName: "A", firstName: "B", birthYear: null, gender: null, club: null, similarity: 0.93, score: 0.93 },
      { itnRecordId: "2", lastName: "A", firstName: "B", birthYear: null, gender: null, club: null, similarity: 0.91, score: 0.91 },
    ]);
    expect(result.tier).toBe("suggest");
    expect(result.candidates).toHaveLength(2);
  });

  it("returns suggest for mid-range scores and none for low scores", () => {
    expect(
      classifyMatches([
        { itnRecordId: "1", lastName: "A", firstName: "B", birthYear: null, gender: null, club: null, similarity: 0.6, score: 0.6 },
      ]).tier,
    ).toBe("suggest");
    expect(
      classifyMatches([
        { itnRecordId: "1", lastName: "A", firstName: "B", birthYear: null, gender: null, club: null, similarity: 0.2, score: 0.2 },
      ]).tier,
    ).toBe("none");
  });
});
