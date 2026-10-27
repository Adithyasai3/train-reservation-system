/**
 * BLACK-BOX: Admin features
 *
 * Decision table for access control on every admin endpoint:
 *
 *   | Rule | Token present | Token valid | Role  | Expected |
 *   |------|---------------|-------------|-------|----------|
 *   | R1   | N             | -           | -     | 401      |
 *   | R2   | Y             | N           | -     | 401      |
 *   | R3   | Y             | Y           | user  | 403      |
 *   | R4   | Y             | Y           | admin | 2xx      |
 */
import { describe, it, expect, beforeAll } from "vitest";
import { api, auth, adminToken, newUserToken, passenger, trainByNumber } from "../helpers.ts";

let admin: string;
let user: string;

beforeAll(async () => {
  admin = await adminToken();
  user = await newUserToken();
});

const newTrain = (num: string, extra: any = {}) => ({
  trainNumber: num, trainName: `Test Express ${num}`,
  sourceStation: "Tirupati", destinationStation: "Kolkata",
  departureTime: "10:00", arrivalTime: "22:00", runningDate: "Daily",
  classes: [{ type: "SL", totalSeats: 100, fare: 300 }, { type: "3A", totalSeats: 40, fare: 900 }],
  ...extra,
});

type Endpoint = { name: string; call: (r: ReturnType<typeof api>) => any; ok: number };
const endpoints: Endpoint[] = [
  { name: "GET /api/admin/users", call: (r) => r.get("/api/admin/users"), ok: 200 },
  { name: "GET /api/admin/bookings", call: (r) => r.get("/api/admin/bookings"), ok: 200 },
  { name: "POST /api/stations", call: (r) => r.post("/api/stations").send({ stationName: "Pune Jn", stationCode: `PU${Date.now() % 100000}`, city: "Pune" }), ok: 201 },
  { name: "DELETE /api/stations/:id", call: (r) => r.delete("/api/stations/999999"), ok: 200 },
  { name: "POST /api/trains", call: (r) => r.post("/api/trains").send(newTrain(`9${Date.now() % 10000}`)), ok: 201 },
  { name: "DELETE /api/trains/:id", call: (r) => r.delete("/api/trains/999999"), ok: 200 },
];

describe("Admin access control (decision table)", () => {
  describe.each(endpoints)("$name", ({ call, ok }) => {
    it("R1 no token -> 401", async () => {
      expect((await call(api())).status).toBe(401);
    });
    it("R2 garbage token -> 401", async () => {
      expect((await call(api()).set(auth("garbage.token.value"))).status).toBe(401);
    });
    it("R3 regular user -> 403", async () => {
      expect((await call(api()).set(auth(user))).status).toBe(403);
    });
    it(`R4 admin -> ${ok}`, async () => {
      expect((await call(api()).set(auth(admin))).status).toBe(ok);
    });
  });
});

describe("Station management", () => {
  it("BB-ADM-ST-01 an added station appears in the public station list", async () => {
    await api().post("/api/stations").set(auth(admin)).send({ stationName: "Mumbai CST", stationCode: "CSMT", city: "Mumbai" });
    const list = (await api().get("/api/stations")).body;
    expect(list).toContainEqual(expect.objectContaining({ stationCode: "CSMT", city: "Mumbai" }));
  });

  it("BB-ADM-ST-02 duplicate station code -> 400", async () => {
    const res = await api().post("/api/stations").set(auth(admin)).send({ stationName: "Hyd 2", stationCode: "HYB", city: "Hyderabad" });
    expect(res.status).toBe(400);
  });

  it("BB-ADM-ST-03 missing city -> 400", async () => {
    const res = await api().post("/api/stations").set(auth(admin)).send({ stationName: "Nowhere", stationCode: "NWH" });
    expect(res.status).toBe(400);
  });

  it("BB-ADM-ST-04 a deleted station disappears from the list", async () => {
    await api().post("/api/stations").set(auth(admin)).send({ stationName: "Temp", stationCode: "TMP", city: "Temp" });
    const st = (await api().get("/api/stations")).body.find((s: any) => s.stationCode === "TMP");
    await api().delete(`/api/stations/${st.id}`).set(auth(admin));
    expect((await api().get("/api/stations")).body.find((s: any) => s.stationCode === "TMP")).toBeUndefined();
  });

  it.fails("BB-ADM-ST-05 DEFECT deleting a non-existent station reports success instead of 404", async () => {
    const res = await api().delete("/api/stations/424242").set(auth(admin));
    expect(res.status).toBe(404);
  });
});

describe("Train management", () => {
  it("BB-ADM-TR-01 an added train is searchable with all seats available", async () => {
    const res = await api().post("/api/trains").set(auth(admin)).send(newTrain("55501"));
    expect(res.status).toBe(201);
    const found = (await api().get("/api/trains/search").query({ source: "Tirupati", destination: "Kolkata" })).body;
    const t = found.find((x: any) => x.trainNumber === "55501");
    expect(t.classes).toHaveLength(2);
    for (const c of t.classes) expect(c.availableSeats).toBe(c.totalSeats);
  });

  it("BB-ADM-TR-02 a newly added train can be booked", async () => {
    await api().post("/api/trains").set(auth(admin)).send(newTrain("55502"));
    const t = await trainByNumber("55502");
    const res = await api().post("/api/bookings").set(auth(user))
      .send({ trainId: t.id, classType: "3A", passengers: passenger(2), journeyDate: "2030-01-01" });
    expect(res.status).toBe(201);
  });

  it("BB-ADM-TR-03 duplicate train number -> 400", async () => {
    const res = await api().post("/api/trains").set(auth(admin)).send(newTrain("12727"));
    expect(res.status).toBe(400);
  });

  it("BB-ADM-TR-04 a deleted train no longer appears in listings or search", async () => {
    await api().post("/api/trains").set(auth(admin)).send(newTrain("55503"));
    const t = await trainByNumber("55503");
    const res = await api().delete(`/api/trains/${t.id}`).set(auth(admin));
    expect(res.status).toBe(200);
    expect(await trainByNumber("55503")).toBeUndefined();
  });

  it.fails("BB-ADM-TR-05 DEFECT adding a train without classes fails but leaves a half-created train", async () => {
    const { classes, ...noClasses } = newTrain("55504");
    const res = await api().post("/api/trains").set(auth(admin)).send(noClasses);
    expect(res.status).toBe(400);
    expect(await trainByNumber("55504")).toBeUndefined();
  });

  it.fails("BB-ADM-TR-06 DEFECT a train with negative seats/fare is accepted", async () => {
    const res = await api().post("/api/trains").set(auth(admin))
      .send(newTrain("55505", { classes: [{ type: "SL", totalSeats: -5, fare: -100 }] }));
    expect(res.status).toBe(400);
  });

  it.fails("BB-ADM-TR-07 DEFECT deleting a train that has bookings crashes with 500", async () => {
    await api().post("/api/trains").set(auth(admin)).send(newTrain("55506"));
    const t = await trainByNumber("55506");
    await api().post("/api/bookings").set(auth(user))
      .send({ trainId: t.id, classType: "SL", passengers: passenger(), journeyDate: "2030-01-01" });
    const res = await api().delete(`/api/trains/${t.id}`).set(auth(admin));
    expect(res.status).toBeLessThan(500);
  });
});

describe("Reports", () => {
  it("BB-ADM-RP-01 user list includes the admin and never exposes passwords", async () => {
    const res = await api().get("/api/admin/users").set(auth(admin));
    expect(res.body).toContainEqual(expect.objectContaining({ email: "admin@railreserve.com", role: "admin" }));
    for (const u of res.body) expect(u.password).toBeUndefined();
  });

  it("BB-ADM-RP-02 all-bookings report shows bookings of every user with user and train info", async () => {
    const t = await trainByNumber("12604");
    const { body } = await api().post("/api/bookings").set(auth(user))
      .send({ trainId: t.id, classType: "CC", passengers: passenger(), journeyDate: "2030-01-01" });
    const res = await api().get("/api/admin/bookings").set(auth(admin));
    expect(res.body).toContainEqual(expect.objectContaining({
      pnr: body.pnr, trainName: "Chennai Express", userName: "Test User", userEmail: expect.stringContaining("@test.com"),
    }));
  });
});
