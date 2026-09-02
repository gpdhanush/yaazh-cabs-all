import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";

describe("health endpoint", () => {
  it("returns runtime details and database status", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("status");
    expect(body.data).toHaveProperty("host");
    expect(body.data).toHaveProperty("port");
    expect(body.data).toHaveProperty("app_url");
    expect(body.data).toHaveProperty("domain");
    expect(body.data).toHaveProperty("database");
    expect(body.data.database).toHaveProperty("connected");
    expect(body.data.database).toHaveProperty("host");
    expect(body.data.database).toHaveProperty("database_name");
  });
});
