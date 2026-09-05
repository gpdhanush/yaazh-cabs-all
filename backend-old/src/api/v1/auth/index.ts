import type { FastifyPluginAsync } from "fastify";
import { authService, parseAuthBody } from "../../../services/auth.service.js";
import { ok } from "../../../utils/api-response.js";
import { requireAuth, requireUser } from "../../../middleware/auth.js";

function required(body: Record<string, string>, key: string): string {
  return body[key]!;
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/customer/register", async (req, reply) => {
    const body = parseAuthBody(req.body, ["name", "phone", "password"]);
    const data = await authService.registerCustomer({
      name: required(body, "name"),
      phone: required(body, "phone"),
      password: required(body, "password"),
      email: body.email,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return ok(reply, data, "Customer registered successfully.", 201);
  });

  app.post("/customer/login", async (req, reply) => {
    const body = parseAuthBody(req.body, ["phone", "password"]);
    const data = await authService.loginCustomer({
      phone: required(body, "phone"),
      password: required(body, "password"),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return ok(reply, data, "Login successful.");
  });

  app.post("/customer/refresh", async (req, reply) => {
    const body = parseAuthBody(req.body, ["refresh_token"]);
    const data = await authService.refresh(required(body, "refresh_token"), "customer");
    return ok(reply, data, "Token refreshed.");
  });

  app.post("/customer/logout", async (req, reply) => {
    const body = parseAuthBody(req.body, ["refresh_token"]);
    const data = await authService.logout(required(body, "refresh_token"));
    return ok(reply, data, "Logged out.");
  });

  app.post(
    "/customer/logout-all",
    { preHandler: [requireAuth("customer")] },
    async (req, reply) => {
      const user = requireUser(req);
      const data = await authService.logoutAll("customer", user.id);
      return ok(reply, data, "Logged out from all devices.");
    },
  );

  app.post("/driver/login", async (req, reply) => {
    const body = parseAuthBody(req.body, ["phone", "password"]);
    const data = await authService.loginDriver({
      phone: required(body, "phone"),
      password: required(body, "password"),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return ok(reply, data, "Login successful.");
  });

  app.post("/driver/refresh", async (req, reply) => {
    const body = parseAuthBody(req.body, ["refresh_token"]);
    const data = await authService.refresh(required(body, "refresh_token"), "driver");
    return ok(reply, data, "Token refreshed.");
  });

  app.post("/driver/logout", async (req, reply) => {
    const body = parseAuthBody(req.body, ["refresh_token"]);
    const data = await authService.logout(required(body, "refresh_token"));
    return ok(reply, data, "Logged out.");
  });

  app.post("/admin/login", async (req, reply) => {
    const body = parseAuthBody(req.body, ["email", "password"]);
    const data = await authService.loginAdmin({
      email: required(body, "email"),
      password: required(body, "password"),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return ok(reply, data, "Login successful.");
  });

  app.post("/admin/refresh", async (req, reply) => {
    const body = parseAuthBody(req.body, ["refresh_token"]);
    const data = await authService.refresh(required(body, "refresh_token"), "admin");
    return ok(reply, data, "Token refreshed.");
  });

  app.post("/admin/logout", async (req, reply) => {
    const body = parseAuthBody(req.body, ["refresh_token"]);
    const data = await authService.logout(required(body, "refresh_token"));
    return ok(reply, data, "Logged out.");
  });
};
