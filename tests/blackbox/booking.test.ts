/**
 * BLACK-BOX: Ticket booking and "my bookings"
 * Techniques: boundary value analysis on seat counts (BVA), equivalence partitioning (EP),
 * error guessing (EG). Each test uses its own train/class where seat state matters.
 */
import { describe, it, expect, beforeAll } from "vitest";
import jwt from "jsonwebtoken";
import { api, auth, newUserToken, passenger, trainByNumber, seatsOf } from "../helpers.ts";

const FUTURE = "2030-06-15";
let token: string;
let godavari: any; // 12727 HYB -> VSKP: SL 200 @450, 3A 120 @950, 2A 60 @1450

const book = (body: any, t = token) => api().post("/api/bookings").set(auth(t)).send(body);

beforeAll(async () => {
  token = await newUserToken();
  godavari = await trainByNumber("12727");
});

describe("POST /api/bookings — authentication", () => {
  it("BB-BK-01 rejects a request with no token (401)", async () => {
    const res = await api().post("/api/bookings").send({ trainId: godavari.id, classType: "SL", passengers: passenger(), journeyDate: FUTURE });
    expect(res.status).toBe(401);
  });

  it("BB-BK-02 rejects a forged token signed with another secret (401)", async () => {
    const forged = jwt.sign({ id: 1, role: "admin" }, "not-the-secret");
    const res = await book({ trainId: godavari.id, classType: "SL", passengers: passenger(), journeyDate: FUTURE }, forged);
    expect(res.status).toBe(401);
  });

  it("BB-BK-03 rejects an expired token (401)", async () => {
    const expired = jwt.sign({ id: 1, role: "user", exp: Math.floor(Date.now() / 1000) - 60 }, "test-secret");
    const res = await book({ trainId: godavari.id, classType: "SL", passengers: passenger(), journeyDate: FUTURE }, expired);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/bookings — valid bookings", () => {
  it("BB-BK-04 [EP valid] books one passenger and returns a PNR", async () => {
    const res = await book({ trainId: godavari.id, classType: "SL", passengers: passenger(1), journeyDate: FUTURE });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Booking successful");
    expect(res.body.pnr).toMatch(/^PNR[A-Z0-9]+$/);
  });

  it("BB-BK-05 decrements available seats by the number of passengers", async () => {
    const before = await seatsOf("12727", "3A");
    await book({ trainId: godavari.id, classType: "3A", passengers: passenger(4), journeyDate: FUTURE });
    expect(await seatsOf("12727", "3A")).toBe(before - 4);
  });

  it.each([1, 2, 6])("BB-BK-06 total fare = class fare x %i passengers", async (n) => {
    const t = await newUserToken();
    await book({ trainId: godavari.id, classType: "2A", passengers: passenger(n), journeyDate: FUTURE }, t);
    const mine = await api().get("/api/bookings/my").set(auth(t));
    expect(mine.body[0].totalFare).toBe(1450 * n);
    expect(mine.body[0].seatCount).toBe(n);
  });

  it("BB-BK-07 every booking gets a distinct PNR", async () => {
    const pnrs = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const res = await book({ trainId: godavari.id, classType: "SL", passengers: passenger(), journeyDate: FUTURE });
      pnrs.add(res.body.pnr);
    }
    expect(pnrs.size).toBe(10);
  });
});

describe("POST /api/bookings — seat-count boundaries (BVA)", () => {
  // Rajdhani Express (Return) 22692, class 1A has exactly 25 seats
  let rajdhani: any;
  beforeAll(async () => { rajdhani = await trainByNumber("22692"); });

  it("BB-BK-08 [max+1] 26 passengers on a 25-seat class is refused and seats are unchanged", async () => {
    const res = await book({ trainId: rajdhani.id, classType: "1A", passengers: passenger(26), journeyDate: FUTURE });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Seats not available");
    expect(await seatsOf("22692", "1A")).toBe(25);
  });

  it("BB-BK-09 [max] exactly 25 passengers fills the class to 0", async () => {
    const res = await book({ trainId: rajdhani.id, classType: "1A", passengers: passenger(25), journeyDate: FUTURE });
    expect(res.status).toBe(201);
    expect(await seatsOf("22692", "1A")).toBe(0);
  });

  it("BB-BK-10 [0 available] a further single passenger is refused", async () => {
    const res = await book({ trainId: rajdhani.id, classType: "1A", passengers: passenger(1), journeyDate: FUTURE });
    expect(res.status).toBe(400);
    expect(await seatsOf("22692", "1A")).toBe(0);
  });

  it("BB-BK-11 [other class unaffected] the full 1A class does not block 2A on the same train", async () => {
    const res = await book({ trainId: rajdhani.id, classType: "2A", passengers: passenger(1), journeyDate: FUTURE });
    expect(res.status).toBe(201);
  });

  it.fails("BB-BK-12 DEFECT [min-1] zero passengers creates a 0-seat booking", async () => {
    const res = await book({ trainId: godavari.id, classType: "SL", passengers: [], journeyDate: FUTURE });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/bookings — invalid input (EP invalid / EG)", () => {
  it("BB-BK-13 class not offered by the train (1A on Godavari) -> 400", async () => {
    const res = await book({ trainId: godavari.id, classType: "1A", passengers: passenger(), journeyDate: FUTURE });
    expect(res.status).toBe(400);
  });

  it("BB-BK-14 non-existent train id -> 400", async () => {
    const res = await book({ trainId: 99999, classType: "SL", passengers: passenger(), journeyDate: FUTURE });
    expect(res.status).toBe(400);
  });

  it("BB-BK-15 missing journeyDate -> 400 and no seats consumed", async () => {
    const before = await seatsOf("12727", "SL");
    const res = await book({ trainId: godavari.id, classType: "SL", passengers: passenger(2) });
    expect(res.status).toBe(400);
    expect(await seatsOf("12727", "SL")).toBe(before);
  });

  it("BB-BK-16 a passenger without a name fails the whole booking atomically", async () => {
    const before = await seatsOf("12727", "SL");
    const res = await book({
      trainId: godavari.id, classType: "SL", journeyDate: FUTURE,
      passengers: [{ name: "Ok", age: 30, gender: "Male" }, { age: 40, gender: "Female" }],
    });
    expect(res.status).toBe(400);
    expect(await seatsOf("12727", "SL")).toBe(before);
  });

  it.fails("BB-BK-17 DEFECT missing passengers field crashes with 500 instead of 400", async () => {
    const res = await book({ trainId: godavari.id, classType: "SL", journeyDate: FUTURE });
    expect(res.status).toBe(400);
  });

  it.fails("BB-BK-18 DEFECT [BVA] negative passenger age is accepted", async () => {
    const res = await book({ trainId: godavari.id, classType: "SL", journeyDate: FUTURE, passengers: [{ name: "X", age: -1, gender: "Male" }] });
    expect(res.status).toBe(400);
  });

  it.fails("BB-BK-19 DEFECT journey date in the past is accepted", async () => {
    const res = await book({ trainId: godavari.id, classType: "SL", journeyDate: "2000-01-01", passengers: passenger() });
    expect(res.status).toBe(400);
  });

  it.fails("BB-BK-20 DEFECT malformed journey date ('tomorrow') is accepted", async () => {
    const res = await book({ trainId: godavari.id, classType: "SL", journeyDate: "tomorrow", passengers: passenger() });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/bookings/my", () => {
  it("BB-MY-01 requires authentication", async () => {
    expect((await api().get("/api/bookings/my")).status).toBe(401);
  });

  it("BB-MY-02 a new user has no bookings", async () => {
    const res = await api().get("/api/bookings/my").set(auth(await newUserToken()));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("BB-MY-03 returns the booking with train details, passengers and Confirmed status", async () => {
    const t = await newUserToken();
    const { body } = await book({ trainId: godavari.id, classType: "3A", journeyDate: FUTURE,
      passengers: [{ name: "Ravi", age: 45, gender: "Male" }, { name: "Sita", age: 42, gender: "Female" }] }, t);
    const res = await api().get("/api/bookings/my").set(auth(t));
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      pnr: body.pnr, trainNumber: "12727", trainName: "Godavari Express",
      sourceStation: "Hyderabad", destinationStation: "Visakhapatnam",
      classType: "3A", journeyDate: FUTURE, bookingStatus: "Confirmed", seatCount: 2, totalFare: 1900,
    });
    expect(res.body[0].passengers.map((p: any) => p.name).sort()).toEqual(["Ravi", "Sita"]);
  });

  it("BB-MY-04 [security] users only see their own bookings", async () => {
    const a = await newUserToken();
    const b = await newUserToken();
    await book({ trainId: godavari.id, classType: "SL", passengers: passenger(), journeyDate: FUTURE }, a);
    const res = await api().get("/api/bookings/my").set(auth(b));
    expect(res.body).toEqual([]);
  });
});
