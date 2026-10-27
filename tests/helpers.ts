import request from "supertest";
import { createApp } from "../app.ts";

export const app = createApp();
export const api = () => request(app);

export const ADMIN = { email: "admin@railreserve.com", password: "password123" };

let userSeq = 0;

export async function login(email: string, password: string): Promise<string> {
  const res = await api().post("/api/auth/login").send({ email, password });
  return res.body.token;
}

export const adminToken = () => login(ADMIN.email, ADMIN.password);

/** Registers a fresh user and returns their token. */
export async function newUserToken(): Promise<string> {
  const email = `user${++userSeq}_${Date.now()}@test.com`;
  await api().post("/api/auth/register").send({ name: "Test User", email, password: "secret123" });
  return login(email, "secret123");
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const passenger = (n = 1) =>
  Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, age: 30, gender: "Male" }));

/** Looks up a seeded train by number via the public API. */
export async function trainByNumber(trainNumber: string) {
  const res = await api().get("/api/trains");
  return res.body.find((t: any) => t.trainNumber === trainNumber);
}

export async function seatsOf(trainNumber: string, type: string): Promise<number> {
  const t = await trainByNumber(trainNumber);
  return t.classes.find((c: any) => c.type === type).availableSeats;
}
