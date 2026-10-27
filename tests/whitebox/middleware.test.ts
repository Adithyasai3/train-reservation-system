/**
 * WHITE-BOX: authenticate / isAdmin middleware — path coverage
 *
 * authenticate:
 *   P1 header missing                          -> token undefined -> 401 "Unauthorized"
 *   P2 header "Bearer" (no 2nd part)           -> token undefined -> 401 "Unauthorized"
 *   P3 header without scheme ("abc")           -> split()[1] undefined -> 401 "Unauthorized"
 *   P4 token present, jwt.verify throws        -> catch -> 401 "Invalid token"
 *   P5 token present, jwt.verify succeeds      -> req.user set, next()
 * isAdmin:
 *   P1 role === "admin" -> next()
 *   P2 role !== "admin" -> 403
 */
import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { authenticate, isAdmin, JWT_SECRET } from "../../app.ts";

function mockRes() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

const run = (mw: Function, req: any) => {
  const res = mockRes();
  const next = vi.fn();
  mw(req, res, next);
  return { req, res, next };
};

describe("authenticate", () => {
  it("WB-MW-A1 no Authorization header -> 401 Unauthorized, next not called", () => {
    const { res, next } = run(authenticate, { headers: {} });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("WB-MW-A2 'Bearer' with no token part -> 401 Unauthorized", () => {
    const { res, next } = run(authenticate, { headers: { authorization: "Bearer" } });
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("WB-MW-A3 token without a scheme prefix is not accepted", () => {
    const token = jwt.sign({ id: 1 }, JWT_SECRET);
    const { res, next } = run(authenticate, { headers: { authorization: token } });
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("WB-MW-A4 malformed token -> catch branch -> 401 Invalid token", () => {
    const { res, next } = run(authenticate, { headers: { authorization: "Bearer not.a.jwt" } });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("WB-MW-A5 token signed with a different secret -> catch branch", () => {
    const token = jwt.sign({ id: 1 }, "wrong-secret");
    const { res } = run(authenticate, { headers: { authorization: `Bearer ${token}` } });
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
  });

  it("WB-MW-A6 valid token -> decoded payload attached to req.user and next() called once", () => {
    const token = jwt.sign({ id: 7, role: "user", email: "u@x.com" }, JWT_SECRET);
    const { req, res, next } = run(authenticate, { headers: { authorization: `Bearer ${token}` } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 7, role: "user", email: "u@x.com" });
  });

  it("WB-MW-A7 the scheme word is not checked: any 'X <token>' is accepted (observed behaviour)", () => {
    const token = jwt.sign({ id: 7 }, JWT_SECRET);
    const { next } = run(authenticate, { headers: { authorization: `Basic ${token}` } });
    expect(next).toHaveBeenCalled();
  });
});

describe("isAdmin", () => {
  it("WB-MW-B1 role admin -> next()", () => {
    const { res, next } = run(isAdmin, { user: { role: "admin" } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each(["user", "Admin", "", undefined])("WB-MW-B2 role %j -> 403 Forbidden", (role) => {
    const { res, next } = run(isAdmin, { user: { role } });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("WB-MW-B3 depends on authenticate having run: throws when req.user is missing", () => {
    expect(() => run(isAdmin, {})).toThrow(TypeError);
  });
});
