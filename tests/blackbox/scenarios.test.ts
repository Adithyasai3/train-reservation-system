/**
 * BLACK-BOX: End-to-end use-case scenarios
 * Each test follows a complete user story through the public API only.
 */
import { describe, it, expect } from "vitest";
import { api, auth, adminToken, passenger, seatsOf } from "../helpers.ts";

describe("Use-case scenarios", () => {
  it("UC-01 passenger journey: register -> login -> search -> book -> view -> cancel", async () => {
    const email = `journey_${Date.now()}@test.com`;
    expect((await api().post("/api/auth/register").send({ name: "Meena", email, password: "travel@1" })).status).toBe(201);

    const login = await api().post("/api/auth/login").send({ email, password: "travel@1" });
    expect(login.status).toBe(200);
    const token = login.body.token;

    const found = (await api().get("/api/trains/search").query({ source: "Hyderabad", destination: "Chennai", date: "2030-03-01" })).body;
    expect(found).toHaveLength(1);
    const train = found[0];
    const sl = train.classes.find((c: any) => c.type === "SL");

    const booked = await api().post("/api/bookings").set(auth(token)).send({
      trainId: train.id, classType: "SL", journeyDate: "2030-03-01",
      passengers: [{ name: "Meena", age: 34, gender: "Female" }, { name: "Arjun", age: 8, gender: "Male" }],
    });
    expect(booked.status).toBe(201);
    expect(await seatsOf(train.trainNumber, "SL")).toBe(sl.availableSeats - 2);

    const mine = (await api().get("/api/bookings/my").set(auth(token))).body;
    expect(mine[0]).toMatchObject({ pnr: booked.body.pnr, totalFare: sl.fare * 2, bookingStatus: "Confirmed" });

    expect((await api().delete(`/api/bookings/cancel/${booked.body.pnr}`).set(auth(token))).status).toBe(200);
    expect(await seatsOf(train.trainNumber, "SL")).toBe(sl.availableSeats);
  });

  it("UC-02 admin journey: add station + train, see a customer booking in the report", async () => {
    const admin = await adminToken();
    expect((await api().post("/api/stations").set(auth(admin)).send({ stationName: "Madurai", stationCode: "MDU", city: "Madurai" })).status).toBe(201);
    expect((await api().post("/api/trains").set(auth(admin)).send({
      trainNumber: "16000", trainName: "Temple Express", sourceStation: "Chennai", destinationStation: "Madurai",
      departureTime: "21:00", arrivalTime: "05:00", runningDate: "Daily",
      classes: [{ type: "SL", totalSeats: 10, fare: 250 }],
    })).status).toBe(201);

    const email = `cust_${Date.now()}@test.com`;
    await api().post("/api/auth/register").send({ name: "Customer", email, password: "pw123456" });
    const cust = (await api().post("/api/auth/login").send({ email, password: "pw123456" })).body.token;
    const train = (await api().get("/api/trains/search").query({ source: "Chennai", destination: "Madurai" })).body[0];
    const { body } = await api().post("/api/bookings").set(auth(cust))
      .send({ trainId: train.id, classType: "SL", passengers: passenger(3), journeyDate: "2030-01-01" });

    const report = (await api().get("/api/admin/bookings").set(auth(admin))).body;
    expect(report).toContainEqual(expect.objectContaining({ pnr: body.pnr, userEmail: email, totalFare: 750 }));
  });

  it("UC-03 sell-out: two customers compete for the last seats of a class", async () => {
    const admin = await adminToken();
    await api().post("/api/trains").set(auth(admin)).send({
      trainNumber: "16100", trainName: "Tiny Express", sourceStation: "Delhi", destinationStation: "Tirupati",
      departureTime: "08:00", arrivalTime: "20:00", runningDate: "Daily",
      classes: [{ type: "1A", totalSeats: 3, fare: 4000 }],
    });
    const train = (await api().get("/api/trains/search").query({ source: "Delhi", destination: "Tirupati" })).body[0];

    const tokens: string[] = [];
    for (const n of ["a", "b"]) {
      const email = `race_${n}_${Date.now()}@test.com`;
      await api().post("/api/auth/register").send({ name: n, email, password: "pw123456" });
      tokens.push((await api().post("/api/auth/login").send({ email, password: "pw123456" })).body.token);
    }
    const attempt = (t: string) => api().post("/api/bookings").set(auth(t))
      .send({ trainId: train.id, classType: "1A", passengers: passenger(2), journeyDate: "2030-01-01" });

    const results = await Promise.all(tokens.map(attempt));
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    expect(await seatsOf("16100", "1A")).toBe(1); // never oversold
  });
});
