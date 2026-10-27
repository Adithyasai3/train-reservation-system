/**
 * BLACK-BOX: Authentication (register / login)
 * Techniques: equivalence partitioning (EP), boundary values (BVA), error guessing (EG).
 * Only the HTTP contract is used — no knowledge of handler internals.
 */
import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { api, ADMIN } from "../helpers.ts";

const unique = (tag: string) => `${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.com`;

describe("POST /api/auth/register", () => {
  it("BB-REG-01 [EP valid] registers a new user with name, email and password", async () => {
    const res = await api().post("/api/auth/register").send({ name: "Asha", email: unique("asha"), password: "secret123" });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User registered successfully");
  });

  it("BB-REG-02 [EP invalid] rejects a duplicate email", async () => {
    const email = unique("dup");
    await api().post("/api/auth/register").send({ name: "A", email, password: "secret123" });
    const res = await api().post("/api/auth/register").send({ name: "B", email, password: "other456" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email already exists");
  });

  it.each([
    ["name", { email: "x1@test.com", password: "secret123" }],
    ["email", { name: "No Email", password: "secret123" }],
    ["password", { name: "No Pass", email: "x2@test.com" }],
  ])("BB-REG-03 [EP invalid] rejects registration with missing %s", async (_field, body) => {
    const res = await api().post("/api/auth/register").send(body);
    expect(res.status).toBe(400);
  });

  it("BB-REG-04 [EP invalid] rejects an empty body", async () => {
    const res = await api().post("/api/auth/register").send({});
    expect(res.status).toBe(400);
  });

  it("BB-REG-05 [security] ignores a client-supplied role (no privilege escalation)", async () => {
    const email = unique("sneaky");
    await api().post("/api/auth/register").send({ name: "Sneaky", email, password: "secret123", role: "admin" });
    const res = await api().post("/api/auth/login").send({ email, password: "secret123" });
    expect(res.body.user.role).toBe("user");
  });

  it.fails("BB-REG-06 DEFECT [EP invalid] accepts a malformed email address", async () => {
    const res = await api().post("/api/auth/register").send({ name: "Bad", email: "not-an-email", password: "secret123" });
    expect(res.status).toBe(400);
  });

  it.fails("BB-REG-07 DEFECT [BVA] accepts an empty-string password (length 0)", async () => {
    const res = await api().post("/api/auth/register").send({ name: "Empty", email: unique("empty"), password: "" });
    expect(res.status).toBe(400);
  });

  it.fails("BB-REG-08 DEFECT [EG] treats emails differing only in case as different accounts", async () => {
    const res = await api().post("/api/auth/register").send({ name: "Dup", email: ADMIN.email.toUpperCase(), password: "secret123" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("BB-LOG-01 [EP valid] logs in the seeded admin and returns token + user", async () => {
    const res = await api().post("/api/auth/login").send(ADMIN);
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({ email: ADMIN.email, role: "admin", name: "Admin User" });
  });

  it("BB-LOG-02 [security] never returns the password hash", async () => {
    const res = await api().post("/api/auth/login").send(ADMIN);
    expect(res.body.user.password).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });

  it("BB-LOG-03 [EP valid] a newly registered user can log in", async () => {
    const email = unique("new");
    await api().post("/api/auth/register").send({ name: "New", email, password: "secret123" });
    const res = await api().post("/api/auth/login").send({ email, password: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("user");
  });

  it("BB-LOG-04 [EP invalid] wrong password -> 401", async () => {
    const res = await api().post("/api/auth/login").send({ email: ADMIN.email, password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("BB-LOG-05 [EP invalid] unknown email -> 401 with the same message (no user enumeration)", async () => {
    const res = await api().post("/api/auth/login").send({ email: "ghost@test.com", password: "whatever" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("BB-LOG-06 [EG] password check is case-sensitive", async () => {
    const res = await api().post("/api/auth/login").send({ email: ADMIN.email, password: "PASSWORD123" });
    expect(res.status).toBe(401);
  });

  it("BB-LOG-07 [EG security] SQL-injection payload in email does not log in", async () => {
    const res = await api().post("/api/auth/login").send({ email: "' OR '1'='1", password: "' OR '1'='1" });
    expect(res.status).toBe(401);
  });

  it("BB-LOG-08 [contract] token is a JWT valid for about one day", async () => {
    const res = await api().post("/api/auth/login").send(ADMIN);
    const payload = jwt.decode(res.body.token) as any;
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
  });
});
