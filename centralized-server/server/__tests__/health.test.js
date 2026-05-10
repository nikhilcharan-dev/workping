import request from "supertest";
import app from "../app/app.js";

describe("Health Check API", () => {
  it("should return status UP on /health", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "UP");
    expect(response.body).toHaveProperty("timestamp");
  });

  it("should return API info on /", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "Running");
    expect(response.body.contributors).toBeInstanceOf(Array);
    expect(response.body.contributors.length).toBeGreaterThan(0);
  });
});
