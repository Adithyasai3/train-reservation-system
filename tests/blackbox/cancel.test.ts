/**
 * BLACK-BOX: Cancellation — state-transition testing
 *
 *   (none) --book--> Confirmed --cancel--> Cancelled --cancel--> (rejected, stays Cancelled)
 *
 * Plus error guessing on PNR ownership and unknown PNRs.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { api, auth, newUserToken, passenger, trainByNumber, seatsOf } from "../helpers.ts";

let token: string;
let sabari: any; // 17230 HYB -> TPTY, SL 180

const cancel = (pnr: string, t = token) => api().delete(`/api/bookings/cancel/${pnr}`).set(auth(t));
const statusOf = async (pnr: string, t = token) =>
  (await api().get("/api/bookings/my").set(auth(t))).body.find((b: any) => b.pnr === pnr)?.bookingStatus;

async function bookSabari(n: number, t = token) {
  const res = await api().post("/api/bookings").set(auth(t))
    .send({ trainId: sabari.id, classType: "SL", passengers: passenger(n), journeyDate: "2030-06-15" });
  return res.body.pnr as string;
}

beforeAll(async () => {
  token = await newUserToken();
  sabari = await trainByNumber("17230");
});

describe("DELETE /api/bookings/cancel/:pnr", () => {
  it("BB-CN-01 [Confirmed -> Cancelled] cancels and restores exactly the booked seats", async () => {
    const start = await seatsOf("17230", "SL");
    const pnr = await bookSabari(3);
    expect(await statusOf(pnr)).toBe("Confirmed");
    expect(await seatsOf("17230", "SL")).toBe(start - 3);

    const res = await cancel(pnr);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancelled successfully/i);
    expect(await statusOf(pnr)).toBe("Cancelled");
    expect(await seatsOf("17230", "SL")).toBe(start);
  });

  it("BB-CN-02 [Cancelled -> cancel] second cancel is rejected and seats are not restored twice", async () => {
    const pnr = await bookSabari(2);
    await cancel(pnr);
    const afterFirst = await seatsOf("17230", "SL");

    const res = await cancel(pnr);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Already cancelled");
    expect(await seatsOf("17230", "SL")).toBe(afterFirst);
    expect(await statusOf(pnr)).toBe("Cancelled");
  });

  it("BB-CN-03 cancelled booking still appears in the user's history", async () => {
    const pnr = await bookSabari(1);
    await cancel(pnr);
    const mine = (await api().get("/api/bookings/my").set(auth(token))).body;
    expect(mine.some((b: any) => b.pnr === pnr)).toBe(true);
  });

  it("BB-CN-04 cancelling one booking leaves the user's other bookings Confirmed", async () => {
    const keep = await bookSabari(1);
    const drop = await bookSabari(1);
    await cancel(drop);
    expect(await statusOf(keep)).toBe("Confirmed");
  });

  it("BB-CN-05 seats freed by a cancellation can be booked again", async () => {
    const t = await newUserToken();
    const rajdhani = await trainByNumber("22691"); // 1A: 25 seats
    const full = await api().post("/api/bookings").set(auth(t))
      .send({ trainId: rajdhani.id, classType: "1A", passengers: passenger(25), journeyDate: "2030-06-15" });
    await cancel(full.body.pnr, t);
    const again = await api().post("/api/bookings").set(auth(t))
      .send({ trainId: rajdhani.id, classType: "1A", passengers: passenger(25), journeyDate: "2030-06-15" });
    expect(again.status).toBe(201);
  });

  it("BB-CN-06 unknown PNR -> 404", async () => {
    const res = await cancel("PNRDOESNOTEXIST");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Booking not found");
  });

  it("BB-CN-07 [security] a user cannot cancel someone else's booking", async () => {
    const pnr = await bookSabari(1);
    const intruder = await newUserToken();
    const res = await cancel(pnr, intruder);
    expect(res.status).toBe(404);
    expect(await statusOf(pnr)).toBe("Confirmed");
  });

  it("BB-CN-08 requires authentication", async () => {
    const pnr = await bookSabari(1);
    const res = await api().delete(`/api/bookings/cancel/${pnr}`);
    expect(res.status).toBe(401);
    expect(await statusOf(pnr)).toBe("Confirmed");
  });
});
