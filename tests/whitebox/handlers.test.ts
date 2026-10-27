/**
 * WHITE-BOX: route handlers and DB layer — branch coverage with direct DB inspection.
 * Uses knowledge of the SQL, the transactions and the internal tables.
 */
import { describe, it, expect, beforeAll } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { api, auth, adminToken, newUserToken, passenger } from "../helpers.ts";
import db, { initDb } from "../../db.ts";

const count = (table: string, where = "1=1", ...args: any[]) =>
  (db.prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE ${where}`).get(...args) as any).c as number;
const cls = (trainNumber: string, type: string) =>
  db.prepare(`SELECT tc.* FROM train_classes tc JOIN trains t ON t.id = tc.trainId WHERE t.trainNumber = ? AND tc.type = ?`)
    .get(trainNumber, type) as any;
const trainId = (n: string) => (db.prepare("SELECT id FROM trains WHERE trainNumber = ?").get(n) as any).id;

describe("initDb (seeding)", () => {
  it("WB-DB-01 seeds 1 admin, 8 stations, 20 trains, 50 classes", () => {
    expect(count("users", "role = 'admin'")).toBe(1);
    expect(count("stations")).toBe(8);
    expect(count("trains")).toBe(20);
    expect(count("train_classes")).toBe(50);
  });

  it("WB-DB-02 is idempotent: the 'count === 0' guards skip re-seeding", () => {
    initDb();
    initDb();
    expect(count("stations")).toBe(8);
    expect(count("trains")).toBe(20);
    expect(count("users", "role = 'admin'")).toBe(1);
  });

  it("WB-DB-03 the seeded admin hash matches the documented password", async () => {
    const admin = db.prepare("SELECT password FROM users WHERE role = 'admin'").get() as any;
    expect(await bcrypt.compare("password123", admin.password)).toBe(true);
  });
});

describe("register handler", () => {
  it("WB-REG-01 stores a bcrypt hash, never the plain password, with default role 'user'", async () => {
    await api().post("/api/auth/register").send({ name: "H", email: "hash@test.com", password: "plain-pw" });
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get("hash@test.com") as any;
    expect(row.password).not.toBe("plain-pw");
    expect(row.password).toMatch(/^\$2[aby]\$10\$/); // cost factor 10
    expect(row.role).toBe("user");
  });

  it("WB-REG-02 catch branch: UNIQUE violation -> 'Email already exists'", async () => {
    const res = await api().post("/api/auth/register").send({ name: "X", email: "admin@railreserve.com", password: "x" });
    expect(res.body.message).toBe("Email already exists");
  });

  it("WB-REG-03 catch branch: other error (NOT NULL) -> 'Registration failed'", async () => {
    const res = await api().post("/api/auth/register").send({ email: "noname@test.com", password: "x" });
    expect(res.body.message).toBe("Registration failed");
    expect(count("users", "email = ?", "noname@test.com")).toBe(0);
  });
});

describe("login handler", () => {
  it("WB-LOG-01 JWT payload carries id, email, role and name, signed with JWT_SECRET", async () => {
    const res = await api().post("/api/auth/login").send({ email: "admin@railreserve.com", password: "password123" });
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET!) as any;
    expect(payload).toMatchObject({ id: 1, email: "admin@railreserve.com", role: "admin", name: "Admin User" });
  });

  it("WB-LOG-02 branch !user short-circuits before bcrypt.compare", async () => {
    const res = await api().post("/api/auth/login").send({ email: "nobody@test.com", password: "x" });
    expect(res.status).toBe(401);
  });

  it("WB-LOG-03 branch compare === false", async () => {
    const res = await api().post("/api/auth/login").send({ email: "admin@railreserve.com", password: "nope" });
    expect(res.status).toBe(401);
  });
});

describe("booking handler", () => {
  let token: string;
  beforeAll(async () => { token = await newUserToken(); });
  const book = (body: any) => api().post("/api/bookings").set(auth(token)).send({ journeyDate: "2030-01-01", ...body });

  it("WB-BK-01 branch !trainClass -> 400 and nothing written", async () => {
    const before = count("bookings");
    const res = await book({ trainId: trainId("12727"), classType: "XX", passengers: passenger() });
    expect(res.body.message).toBe("Seats not available");
    expect(count("bookings")).toBe(before);
  });

  it("WB-BK-02 branch availableSeats < seatCount -> 400 and nothing written", async () => {
    db.prepare("UPDATE train_classes SET availableSeats = 1 WHERE id = ?").run(cls("12604", "2A").id);
    const before = count("bookings");
    const res = await book({ trainId: trainId("12604"), classType: "2A", passengers: passenger(2) });
    expect(res.status).toBe(400);
    expect(count("bookings")).toBe(before);
  });

  it("WB-BK-03 success path writes 1 booking, N passengers and decrements the right class row", async () => {
    const sl = cls("12841", "SL");
    const other = cls("12841", "3A");
    const res = await book({ trainId: trainId("12841"), classType: "SL", passengers: passenger(3) });

    const b = db.prepare("SELECT * FROM bookings WHERE pnr = ?").get(res.body.pnr) as any;
    expect(b).toMatchObject({ seatCount: 3, totalFare: sl.fare * 3, bookingStatus: "Confirmed", classType: "SL" });
    expect(count("passengers", "bookingId = ?", b.id)).toBe(3);
    expect(cls("12841", "SL").availableSeats).toBe(sl.availableSeats - 3);
    expect(cls("12841", "3A").availableSeats).toBe(other.availableSeats);
  });

  it("WB-BK-04 transaction rollback: failure on the 2nd passenger insert leaves no booking/passenger rows", async () => {
    const sl = cls("12760", "SL");
    const bookingsBefore = count("bookings");
    const passengersBefore = count("passengers");
    const res = await book({
      trainId: trainId("12760"), classType: "SL",
      passengers: [{ name: "A", age: 20, gender: "Male" }, { name: "B", age: null, gender: "Male" }],
    });
    expect(res.body.message).toBe("Booking failed");
    expect(count("bookings")).toBe(bookingsBefore);
    expect(count("passengers")).toBe(passengersBefore);
    expect(cls("12760", "SL").availableSeats).toBe(sl.availableSeats);
  });

  it("WB-BK-05 PNR format: 'PNR' + up to 8 base-36 chars, uppercased", async () => {
    const res = await book({ trainId: trainId("12626"), classType: "SL", passengers: passenger() });
    expect(res.body.pnr).toMatch(/^PNR[0-9A-Z]{1,8}$/);
  });
});

describe("cancel handler", () => {
  let token: string;
  beforeAll(async () => { token = await newUserToken(); });

  it("WB-CN-01 restores seats on the class matched by (trainId, classType) only", async () => {
    const id = trainId("12723");
    const { body } = await api().post("/api/bookings").set(auth(token))
      .send({ trainId: id, classType: "2A", passengers: passenger(2), journeyDate: "2030-01-01" });
    const twoA = cls("12723", "2A").availableSeats;
    const threeA = cls("12723", "3A").availableSeats;

    await api().delete(`/api/bookings/cancel/${body.pnr}`).set(auth(token));
    expect(cls("12723", "2A").availableSeats).toBe(twoA + 2);
    expect(cls("12723", "3A").availableSeats).toBe(threeA);
    expect((db.prepare("SELECT bookingStatus FROM bookings WHERE pnr = ?").get(body.pnr) as any).bookingStatus).toBe("Cancelled");
  });

  it("WB-CN-02 'Already cancelled' branch does not touch train_classes", async () => {
    const { body } = await api().post("/api/bookings").set(auth(token))
      .send({ trainId: trainId("12839"), classType: "SL", passengers: passenger(1), journeyDate: "2030-01-01" });
    await api().delete(`/api/bookings/cancel/${body.pnr}`).set(auth(token));
    const seats = cls("12839", "SL").availableSeats;
    const res = await api().delete(`/api/bookings/cancel/${body.pnr}`).set(auth(token));
    expect(res.status).toBe(400);
    expect(cls("12839", "SL").availableSeats).toBe(seats);
  });

  it("WB-CN-03 ownership is enforced in SQL (pnr AND userId): other user's PNR is 'not found'", async () => {
    const { body } = await api().post("/api/bookings").set(auth(token))
      .send({ trainId: trainId("12839"), classType: "3A", passengers: passenger(1), journeyDate: "2030-01-01" });
    const res = await api().delete(`/api/bookings/cancel/${body.pnr}`).set(auth(await newUserToken()));
    expect(res.status).toBe(404);
  });
});

describe("admin train handlers", () => {
  let admin: string;
  beforeAll(async () => { admin = await adminToken(); });

  it("WB-ADM-01 POST /trains initialises availableSeats from totalSeats, ignoring a client value", async () => {
    await api().post("/api/trains").set(auth(admin)).send({
      trainNumber: "77001", trainName: "WB", sourceStation: "A", destinationStation: "B",
      departureTime: "1", arrivalTime: "2", runningDate: "Daily",
      classes: [{ type: "SL", totalSeats: 50, availableSeats: 999, fare: 100 }],
    });
    expect(cls("77001", "SL")).toMatchObject({ totalSeats: 50, availableSeats: 50 });
  });

  it("WB-ADM-02 DELETE /trains removes the train and its class rows", async () => {
    await api().post("/api/trains").set(auth(admin)).send({
      trainNumber: "77002", trainName: "WB2", sourceStation: "A", destinationStation: "B",
      departureTime: "1", arrivalTime: "2", runningDate: "Daily",
      classes: [{ type: "SL", totalSeats: 5, fare: 1 }, { type: "3A", totalSeats: 5, fare: 2 }],
    });
    const id = trainId("77002");
    await api().delete(`/api/trains/${id}`).set(auth(admin));
    expect(count("trains", "id = ?", id)).toBe(0);
    expect(count("train_classes", "trainId = ?", id)).toBe(0);
  });

  it("WB-ADM-03 POST /trains is not transactional: a failing class insert leaves the train row behind", async () => {
    const res = await api().post("/api/trains").set(auth(admin)).send({
      trainNumber: "77003", trainName: "WB3", sourceStation: "A", destinationStation: "B",
      departureTime: "1", arrivalTime: "2", runningDate: "Daily",
      classes: [{ type: "SL", totalSeats: 5, fare: 1 }, { type: null, totalSeats: 5, fare: 2 }],
    });
    expect(res.status).toBe(400);
    // documents the defect found in black-box test BB-ADM-TR-05
    expect(count("trains", "trainNumber = '77003'")).toBe(1);
    expect(count("train_classes", "trainId = ?", trainId("77003"))).toBe(1);
  });

  it("WB-ADM-04 foreign keys are enforced, which is why deleting a booked train throws (BB-ADM-TR-07)", () => {
    expect((db.pragma("foreign_keys", { simple: true }))).toBe(1);
  });
});
