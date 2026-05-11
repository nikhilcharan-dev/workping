// Unit tests for helpers/pagination.js
// We mock the model's .aggregate() method to avoid hitting MongoDB.
import pagination from "../helpers/pagination.js";

function fakeModel({ countResult, documentsResult }) {
  let callIdx = 0;
  return {
    aggregate: jest.fn(async (_pipeline) => {
      // First call → count pipeline, second → documents pipeline
      callIdx += 1;
      return callIdx === 1 ? countResult : documentsResult;
    }),
  };
}

describe("pagination helper", () => {
  it("returns documents with totalRecords/totalPages when count > 0", async () => {
    const docs = [{ _id: "1" }, { _id: "2" }];
    const model = fakeModel({ countResult: [{ count: 25 }], documentsResult: docs });
    const out = await pagination(model, 1, 10, []);
    expect(out.documents).toEqual(docs);
    expect(out.totalRecords).toBe(25);
    expect(out.totalPages).toBe(3); // ceil(25/10)
  });

  it("returns zero counts when the count pipeline is empty", async () => {
    const model = fakeModel({ countResult: [], documentsResult: [] });
    const out = await pagination(model, 1, 10, []);
    expect(out.totalRecords).toBe(0);
    expect(out.totalPages).toBe(0);
  });

  it("clamps page to >= 1 and limit to >= 1", async () => {
    const model = fakeModel({ countResult: [{ count: 5 }], documentsResult: [] });
    // Pass nonsense values; should not throw
    await pagination(model, -10, 0, []);
    // Second invocation gets the $skip and $limit appended; we can read them
    // from the filter array via the mock's last call.
    const lastCallPipeline = model.aggregate.mock.calls[1][0];
    const skipStage = lastCallPipeline.find((s) => "$skip" in s);
    const limitStage = lastCallPipeline.find((s) => "$limit" in s);
    expect(skipStage.$skip).toBe(0); // (1 - 1) * 1
    expect(limitStage.$limit).toBe(1);
  });

  it("returns empty result shape on aggregate error (no throw)", async () => {
    const model = { aggregate: jest.fn(async () => { throw new Error("db down"); }) };
    const out = await pagination(model, 1, 10, []);
    expect(out).toEqual({ documents: [], totalRecords: 0, totalPages: 0 });
  });

  it("does not push $skip/$limit when limit is NaN (omit pagination)", async () => {
    const model = fakeModel({ countResult: [{ count: 3 }], documentsResult: [] });
    const filter = [{ $match: { x: 1 } }];
    await pagination(model, 1, "not-a-number", filter);
    const docsCallPipeline = model.aggregate.mock.calls[1][0];
    expect(docsCallPipeline.some((s) => "$skip" in s)).toBe(false);
    expect(docsCallPipeline.some((s) => "$limit" in s)).toBe(false);
  });
});
