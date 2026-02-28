import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import db, { initDb } from "./db.ts";

const JWT_SECRET = process.env.JWT_SECRET || "rail-reserve-secret-key-2026";

async function startServer() {
  initDb();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    next();
  };

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)").run(name, email, hashedPassword);
      res.status(201).json({ message: "User registered successfully" });
    } catch (err: any) {
      res.status(400).json({ message: err.message.includes("UNIQUE") ? "Email already exists" : "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  // --- Station Routes ---
  app.get("/api/stations", (req, res) => {
    const stations = db.prepare("SELECT * FROM stations").all();
    res.json(stations);
  });

  app.post("/api/stations", authenticate, isAdmin, (req, res) => {
    const { stationName, stationCode, city } = req.body;
    try {
      db.prepare("INSERT INTO stations (stationName, stationCode, city) VALUES (?, ?, ?)").run(stationName, stationCode, city);
      res.status(201).json({ message: "Station added" });
    } catch (err) {
      res.status(400).json({ message: "Failed to add station" });
    }
  });

  app.delete("/api/stations/:id", authenticate, isAdmin, (req, res) => {
    db.prepare("DELETE FROM stations WHERE id = ?").run(req.params.id);
    res.json({ message: "Station deleted" });
  });

  // --- Train Routes ---
  app.get("/api/trains/search", (req, res) => {
    const { source, destination, date } = req.query;
    const trains: any[] = db.prepare(`
      SELECT t.* FROM trains t 
      WHERE t.sourceStation = ? AND t.destinationStation = ?
    `).all(source, destination);

    const result = trains.map(t => {
      const classes = db.prepare("SELECT * FROM train_classes WHERE trainId = ?").all(t.id);
      return { ...t, classes };
    });
    res.json(result);
  });

  app.get("/api/trains", (req, res) => {
    const trains = db.prepare("SELECT * FROM trains").all();
    const result = trains.map((t: any) => {
      const classes = db.prepare("SELECT * FROM train_classes WHERE trainId = ?").all(t.id);
      return { ...t, classes };
    });
    res.json(result);
  });

  app.post("/api/trains", authenticate, isAdmin, (req, res) => {
    const { trainNumber, trainName, sourceStation, destinationStation, departureTime, arrivalTime, runningDate, classes } = req.body;
    try {
      const result = db.prepare("INSERT INTO trains (trainNumber, trainName, sourceStation, destinationStation, departureTime, arrivalTime, runningDate) VALUES (?, ?, ?, ?, ?, ?, ?)").run(trainNumber, trainName, sourceStation, destinationStation, departureTime, arrivalTime, runningDate);
      const trainId = result.lastInsertRowid;
      const insertClass = db.prepare("INSERT INTO train_classes (trainId, type, totalSeats, availableSeats, fare) VALUES (?, ?, ?, ?, ?)");
      classes.forEach((c: any) => insertClass.run(trainId, c.type, c.totalSeats, c.totalSeats, c.fare));
      res.status(201).json({ message: "Train added" });
    } catch (err) {
      res.status(400).json({ message: "Failed to add train" });
    }
  });

  app.delete("/api/trains/:id", authenticate, isAdmin, (req, res) => {
    db.prepare("DELETE FROM trains WHERE id = ?").run(req.params.id);
    db.prepare("DELETE FROM train_classes WHERE trainId = ?").run(req.params.id);
    res.json({ message: "Train deleted" });
  });

  // --- Booking Routes ---
  app.post("/api/bookings", authenticate, (req: any, res) => {
    const { trainId, classType, passengers, journeyDate } = req.body;
    const userId = req.user.id;
    const seatCount = passengers.length;

    try {
      // Check availability
      const trainClass: any = db.prepare("SELECT * FROM train_classes WHERE trainId = ? AND type = ?").get(trainId, classType);
      if (!trainClass || trainClass.availableSeats < seatCount) {
        return res.status(400).json({ message: "Seats not available" });
      }

      const totalFare = trainClass.fare * seatCount;
      const pnr = "PNR" + Math.random().toString(36).substr(2, 8).toUpperCase();

      const transaction = db.transaction(() => {
        const bookingResult = db.prepare(`
          INSERT INTO bookings (userId, trainId, classType, seatCount, totalFare, pnr, journeyDate) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, trainId, classType, seatCount, totalFare, pnr, journeyDate);
        
        const bookingId = bookingResult.lastInsertRowid;
        const insertPassenger = db.prepare("INSERT INTO passengers (bookingId, name, age, gender) VALUES (?, ?, ?, ?)");
        passengers.forEach((p: any) => insertPassenger.run(bookingId, p.name, p.age, p.gender));

        db.prepare("UPDATE train_classes SET availableSeats = availableSeats - ? WHERE id = ?").run(seatCount, trainClass.id);
        return pnr;
      });

      const generatedPnr = transaction();
      res.status(201).json({ message: "Booking successful", pnr: generatedPnr });
    } catch (err) {
      res.status(400).json({ message: "Booking failed" });
    }
  });

  app.get("/api/bookings/my", authenticate, (req: any, res) => {
    const bookings = db.prepare(`
      SELECT b.*, t.trainName, t.trainNumber, t.sourceStation, t.destinationStation, t.departureTime, t.arrivalTime
      FROM bookings b
      JOIN trains t ON b.trainId = t.id
      WHERE b.userId = ?
      ORDER BY b.bookingDate DESC
    `).all(req.user.id);

    const result = bookings.map((b: any) => {
      const passengers = db.prepare("SELECT * FROM passengers WHERE bookingId = ?").all(b.id);
      return { ...b, passengers };
    });
    res.json(result);
  });

  app.delete("/api/bookings/cancel/:pnr", authenticate, (req: any, res) => {
    const booking: any = db.prepare("SELECT * FROM bookings WHERE pnr = ? AND userId = ?").get(req.params.pnr, req.user.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.bookingStatus === "Cancelled") return res.status(400).json({ message: "Already cancelled" });

    const transaction = db.transaction(() => {
      db.prepare("UPDATE bookings SET bookingStatus = 'Cancelled' WHERE id = ?").run(booking.id);
      db.prepare("UPDATE train_classes SET availableSeats = availableSeats + ? WHERE trainId = ? AND type = ?")
        .run(booking.seatCount, booking.trainId, booking.classType);
    });
    transaction();
    res.json({ message: "Booking cancelled successfully. Refund initiated." });
  });

  // --- Admin Routes ---
  app.get("/api/admin/bookings", authenticate, isAdmin, (req, res) => {
    const bookings = db.prepare(`
      SELECT b.*, t.trainName, t.trainNumber, u.name as userName, u.email as userEmail
      FROM bookings b
      JOIN trains t ON b.trainId = t.id
      JOIN users u ON b.userId = u.id
      ORDER BY b.bookingDate DESC
    `).all();
    res.json(bookings);
  });

  app.get("/api/admin/users", authenticate, isAdmin, (req, res) => {
    const users = db.prepare("SELECT id, name, email, role FROM users").all();
    res.json(users);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
