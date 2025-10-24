import request from "supertest";
import app from "../src/app";

describe("GET /api/users", () => {
  it("Should return users details", async () => {
    const res = await request(app).get("/api/users");

    expect(res.status).toBe(200);
  });
});
