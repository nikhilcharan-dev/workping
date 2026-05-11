// Unit tests for helpers/data.reducer.js
import { pick, formatUserDates } from "../helpers/data.reducer.js";

describe("pick", () => {
  it("returns only the requested keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });

  it("ignores keys that are not present in the source object", () => {
    expect(pick({ a: 1 }, ["a", "b"])).toEqual({ a: 1 });
  });

  it("returns an empty object when keys array is empty", () => {
    expect(pick({ a: 1, b: 2 }, [])).toEqual({});
  });
});

describe("formatUserDates", () => {
  it("returns the value as-is when user is null/undefined", () => {
    expect(formatUserDates(null)).toBe(null);
    expect(formatUserDates(undefined)).toBe(undefined);
  });

  it("converts Date dateOfJoining to YYYY-MM-DD", () => {
    const out = formatUserDates({ dateOfJoining: new Date("2024-06-15T09:30:00Z") });
    expect(out.dateOfJoining).toBe("2024-06-15");
  });

  it("converts Date dob to YYYY-MM-DD", () => {
    const out = formatUserDates({ dob: new Date("1995-12-31T18:00:00Z") });
    expect(out.dob).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("leaves non-Date dob/dateOfJoining values untouched", () => {
    const out = formatUserDates({ dob: "already-a-string", dateOfJoining: 12345 });
    expect(out.dob).toBe("already-a-string");
    expect(out.dateOfJoining).toBe(12345);
  });

  it("calls toObject() when the input is a Mongoose document", () => {
    const fakeDoc = {
      toObject() {
        return { dateOfJoining: new Date("2023-01-02"), other: "x" };
      },
    };
    const out = formatUserDates(fakeDoc);
    expect(out.dateOfJoining).toBe("2023-01-02");
    expect(out.other).toBe("x");
  });

  it("does not mutate the original object", () => {
    const original = { dateOfJoining: new Date("2024-01-01"), name: "A" };
    formatUserDates(original);
    expect(original.dateOfJoining).toBeInstanceOf(Date);
  });
});
