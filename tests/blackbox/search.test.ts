/**
 * BLACK-BOX: Stations, train listing and train search
 * Techniques: equivalence partitioning (EP), error guessing (EG).
 */
import { describe, it, expect } from "vitest";
import { api } from "../helpers.ts";

const search = (q: Record<string, string>) => api().get("/api/trains/search").query(q);

describe("GET /api/stations", () => {
  it("BB-STN-01 is public and lists the 8 seeded stations", async () => {
    const res = await api().get("/api/stations");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8);
    expect(res.body.map((s: any) => s.stationCode)).toEqual(
      expect.arrayContaining(["HYB", "VSKP", "SBC", "MAS", "TPTY", "NDLS", "HWH", "CAPE"]),
    );
  });

  it("BB-STN-02 each station has id, stationName, stationCode and city", async () => {
    const res = await api().get("/api/stations");
    for (const s of res.body) {
      expect(s).toEqual({ id: expect.any(Number), stationName: expect.any(String), stationCode: expect.any(String), city: expect.any(String) });
    }
  });
});

describe("GET /api/trains", () => {
  it("BB-TRN-01 is public and lists all 20 seeded trains with their classes", async () => {
    const res = await api().get("/api/trains");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(20);
    for (const t of res.body) expect(t.classes.length).toBeGreaterThan(0);
  });

  it("BB-TRN-02 every class starts with availableSeats == totalSeats and a positive fare", async () => {
    const res = await api().get("/api/trains");
    for (const t of res.body)
      for (const c of t.classes) {
        expect(c.availableSeats).toBe(c.totalSeats);
        expect(c.fare).toBeGreaterThan(0);
      }
  });
});

describe("GET /api/trains/search", () => {
  it("BB-SRCH-01 [EP valid, one result] Hyderabad -> Visakhapatnam returns Godavari Express", async () => {
    const res = await search({ source: "Hyderabad", destination: "Visakhapatnam", date: "2030-01-01" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ trainNumber: "12727", trainName: "Godavari Express" });
    expect(res.body[0].classes.map((c: any) => c.type).sort()).toEqual(["2A", "3A", "SL"]);
  });

  it("BB-SRCH-02 [EP valid, many results] Bangalore -> Chennai returns both trains on the route", async () => {
    const res = await search({ source: "Bangalore", destination: "Chennai", date: "2030-01-01" });
    expect(res.body.map((t: any) => t.trainNumber).sort()).toEqual(["12007", "12604"]);
  });

  it("BB-SRCH-03 [EP] search is directional: reverse route returns the return train only", async () => {
    const res = await search({ source: "Visakhapatnam", destination: "Hyderabad", date: "2030-01-01" });
    expect(res.body.map((t: any) => t.trainNumber)).toEqual(["12728"]);
  });

  it("BB-SRCH-04 [EP valid, no results] route with no service returns an empty list", async () => {
    const res = await search({ source: "Tirupati", destination: "Kolkata", date: "2030-01-01" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("BB-SRCH-05 [EP invalid] source == destination returns no trains", async () => {
    const res = await search({ source: "Delhi", destination: "Delhi", date: "2030-01-01" });
    expect(res.body).toEqual([]);
  });

  it("BB-SRCH-06 [EP invalid] unknown station returns empty list, not an error", async () => {
    const res = await search({ source: "Atlantis", destination: "Chennai" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("BB-SRCH-07 [EP invalid] missing query parameters returns empty list, not a crash", async () => {
    const res = await api().get("/api/trains/search");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("BB-SRCH-08 [EG security] SQL injection in source does not dump all trains", async () => {
    const res = await search({ source: "x' OR '1'='1", destination: "x' OR '1'='1" });
    expect(res.body).toEqual([]);
  });

  it.fails("BB-SRCH-09 DEFECT [EG] search is case-sensitive ('hyderabad' finds nothing)", async () => {
    const res = await search({ source: "hyderabad", destination: "visakhapatnam" });
    expect(res.body).toHaveLength(1);
  });
});
