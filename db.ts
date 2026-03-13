import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('rail_reserve.db');

// Initialize database tables
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stationName TEXT NOT NULL,
      stationCode TEXT UNIQUE NOT NULL,
      city TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trainNumber TEXT UNIQUE NOT NULL,
      trainName TEXT NOT NULL,
      sourceStation TEXT NOT NULL,
      destinationStation TEXT NOT NULL,
      departureTime TEXT NOT NULL,
      arrivalTime TEXT NOT NULL,
      runningDate TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS train_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trainId INTEGER NOT NULL,
      type TEXT NOT NULL,
      totalSeats INTEGER NOT NULL,
      availableSeats INTEGER NOT NULL,
      fare INTEGER NOT NULL,
      FOREIGN KEY (trainId) REFERENCES trains(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      trainId INTEGER NOT NULL,
      classType TEXT NOT NULL,
      seatCount INTEGER NOT NULL,
      totalFare INTEGER NOT NULL,
      pnr TEXT UNIQUE NOT NULL,
      bookingStatus TEXT DEFAULT 'Confirmed',
      journeyDate TEXT NOT NULL,
      bookingDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (trainId) REFERENCES trains(id)
    );

    CREATE TABLE IF NOT EXISTS passengers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookingId INTEGER NOT NULL,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL,
      FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE
    );
  `);

  // Seed initial data if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    // Admin user
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
      'Admin User',
      'admin@railreserve.com',
      '$2b$10$ba8ZCnz6WN27ovxP0.v88uyT8bXJ2cqGCiBHjuFG7GqB5cqp5v2b2', // password: password123
      'admin'
    );
  }

  const stationCount = db.prepare('SELECT COUNT(*) as count FROM stations').get() as { count: number };
  if (stationCount.count === 0) {
    const stations = [
      { name: 'Hyderabad', code: 'HYB', city: 'Hyderabad' },
      { name: 'Visakhapatnam', code: 'VSKP', city: 'Visakhapatnam' },
      { name: 'Bangalore', code: 'SBC', city: 'Bangalore' },
      { name: 'Chennai', code: 'MAS', city: 'Chennai' },
      { name: 'Tirupati', code: 'TPTY', city: 'Tirupati' },
      { name: 'Delhi', code: 'NDLS', city: 'Delhi' },
      { name: 'Kolkata', code: 'HWH', city: 'Kolkata' },
      { name: 'Kanyakumari', code: 'CAPE', city: 'Kanyakumari' },
    ];
    const insertStation = db.prepare('INSERT INTO stations (stationName, stationCode, city) VALUES (?, ?, ?)');
    stations.forEach(s => insertStation.run(s.name, s.code, s.city));
  }

  const trainCount = db.prepare('SELECT COUNT(*) as count FROM trains').get() as { count: number };
  if (trainCount.count === 0) {
    const sampleTrains = [
      {
        trainNumber: "12727",
        trainName: "Godavari Express",
        source: "Hyderabad",
        destination: "Visakhapatnam",
        departureTime: "17:15",
        arrivalTime: "05:30",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 200, availableSeats: 200, fare: 450 },
          { type: "3A", totalSeats: 120, availableSeats: 120, fare: 950 },
          { type: "2A", totalSeats: 60, availableSeats: 60, fare: 1450 }
        ]
      },
      {
        trainNumber: "12604",
        trainName: "Chennai Express",
        source: "Bangalore",
        destination: "Chennai",
        departureTime: "06:00",
        arrivalTime: "11:30",
        runningDate: "Daily",
        classes: [
          { type: "CC", totalSeats: 150, availableSeats: 150, fare: 500 },
          { type: "2A", totalSeats: 50, availableSeats: 50, fare: 1200 }
        ]
      },
      {
        trainNumber: "12841",
        trainName: "Coromandel Express",
        source: "Chennai",
        destination: "Visakhapatnam",
        departureTime: "14:00",
        arrivalTime: "02:45",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 220, availableSeats: 220, fare: 500 },
          { type: "3A", totalSeats: 140, availableSeats: 140, fare: 1100 },
          { type: "2A", totalSeats: 70, availableSeats: 70, fare: 1600 }
        ]
      },
      {
        trainNumber: "17230",
        trainName: "Sabari Express",
        source: "Hyderabad",
        destination: "Tirupati",
        departureTime: "20:30",
        arrivalTime: "08:10",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 180, availableSeats: 180, fare: 420 },
          { type: "3A", totalSeats: 100, availableSeats: 100, fare: 920 }
        ]
      },
      {
        trainNumber: "12760",
        trainName: "Charminar Express",
        source: "Hyderabad",
        destination: "Chennai",
        departureTime: "18:00",
        arrivalTime: "06:30",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 210, availableSeats: 210, fare: 480 },
          { type: "3A", totalSeats: 110, availableSeats: 110, fare: 980 },
          { type: "2A", totalSeats: 55, availableSeats: 55, fare: 1500 }
        ]
      },
      {
        trainNumber: "22691",
        trainName: "Rajdhani Express",
        source: "Bangalore",
        destination: "Delhi",
        departureTime: "20:00",
        arrivalTime: "05:30",
        runningDate: "Daily",
        classes: [
          { type: "3A", totalSeats: 130, availableSeats: 130, fare: 2200 },
          { type: "2A", totalSeats: 70, availableSeats: 70, fare: 3200 },
          { type: "1A", totalSeats: 25, availableSeats: 25, fare: 5000 }
        ]
      },
      {
        trainNumber: "12626",
        trainName: "Kerala Express",
        source: "Delhi",
        destination: "Chennai",
        departureTime: "11:25",
        arrivalTime: "19:15",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 250, availableSeats: 250, fare: 650 },
          { type: "3A", totalSeats: 150, availableSeats: 150, fare: 1600 }
        ]
      },
      {
        trainNumber: "12723",
        trainName: "Telangana Express",
        source: "Hyderabad",
        destination: "Delhi",
        departureTime: "06:00",
        arrivalTime: "07:40",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 230, availableSeats: 230, fare: 700 },
          { type: "3A", totalSeats: 130, availableSeats: 130, fare: 1700 },
          { type: "2A", totalSeats: 60, availableSeats: 60, fare: 2500 }
        ]
      },
      {
        trainNumber: "12839",
        trainName: "Howrah Mail",
        source: "Chennai",
        destination: "Kolkata",
        departureTime: "23:40",
        arrivalTime: "03:30",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 240, availableSeats: 240, fare: 750 },
          { type: "3A", totalSeats: 130, availableSeats: 130, fare: 1800 }
        ]
      },
      {
        trainNumber: "16526",
        trainName: "Island Express",
        source: "Bangalore",
        destination: "Kanyakumari",
        departureTime: "20:30",
        arrivalTime: "14:00",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 200, availableSeats: 200, fare: 600 },
          { type: "3A", totalSeats: 120, availableSeats: 120, fare: 1400 }
        ]
      },
      {
        trainNumber: "22692",
        trainName: "Rajdhani Express (Return)",
        source: "Delhi",
        destination: "Bangalore",
        departureTime: "21:00",
        arrivalTime: "06:40",
        runningDate: "Daily",
        classes: [
          { type: "3A", totalSeats: 130, availableSeats: 130, fare: 2200 },
          { type: "2A", totalSeats: 70, availableSeats: 70, fare: 3200 },
          { type: "1A", totalSeats: 25, availableSeats: 25, fare: 5000 }
        ]
      },
      {
        trainNumber: "12840",
        trainName: "Howrah Mail (Return)",
        source: "Kolkata",
        destination: "Chennai",
        departureTime: "23:55",
        arrivalTime: "03:50",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 240, availableSeats: 240, fare: 750 },
          { type: "3A", totalSeats: 130, availableSeats: 130, fare: 1800 }
        ]
      },
      {
        trainNumber: "12728",
        trainName: "Godavari Express (Return)",
        source: "Visakhapatnam",
        destination: "Hyderabad",
        departureTime: "17:20",
        arrivalTime: "05:45",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 200, availableSeats: 200, fare: 450 },
          { type: "3A", totalSeats: 120, availableSeats: 120, fare: 950 },
          { type: "2A", totalSeats: 60, availableSeats: 60, fare: 1450 }
        ]
      },
      {
        trainNumber: "12603",
        trainName: "Chennai Express (Return)",
        source: "Chennai",
        destination: "Bangalore",
        departureTime: "06:15",
        arrivalTime: "11:45",
        runningDate: "Daily",
        classes: [
          { type: "CC", totalSeats: 150, availableSeats: 150, fare: 500 },
          { type: "2A", totalSeats: 50, availableSeats: 50, fare: 1200 }
        ]
      },
      {
        trainNumber: "17229",
        trainName: "Sabari Express (Return)",
        source: "Tirupati",
        destination: "Hyderabad",
        departureTime: "20:45",
        arrivalTime: "08:25",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 180, availableSeats: 180, fare: 420 },
          { type: "3A", totalSeats: 100, availableSeats: 100, fare: 920 }
        ]
      },
      {
        trainNumber: "12724",
        trainName: "Telangana Express (Return)",
        source: "Delhi",
        destination: "Hyderabad",
        departureTime: "06:15",
        arrivalTime: "07:55",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 230, availableSeats: 230, fare: 700 },
          { type: "3A", totalSeats: 130, availableSeats: 130, fare: 1700 },
          { type: "2A", totalSeats: 60, availableSeats: 60, fare: 2500 }
        ]
      },
      {
        trainNumber: "16525",
        trainName: "Island Express (Return)",
        source: "Kanyakumari",
        destination: "Bangalore",
        departureTime: "20:45",
        arrivalTime: "14:15",
        runningDate: "Daily",
        classes: [
          { type: "SL", totalSeats: 200, availableSeats: 200, fare: 600 },
          { type: "3A", totalSeats: 120, availableSeats: 120, fare: 1400 }
        ]
      },
      {
        trainNumber: "12260",
        trainName: "Duronto Express",
        source: "Kolkata",
        destination: "Delhi",
        departureTime: "17:00",
        arrivalTime: "10:30",
        runningDate: "Daily",
        classes: [
          { type: "3A", totalSeats: 150, availableSeats: 150, fare: 2500 },
          { type: "2A", totalSeats: 80, availableSeats: 80, fare: 3500 },
          { type: "1A", totalSeats: 30, availableSeats: 30, fare: 5500 }
        ]
      },
      {
        trainNumber: "12259",
        trainName: "Duronto Express (Return)",
        source: "Delhi",
        destination: "Kolkata",
        departureTime: "17:15",
        arrivalTime: "10:45",
        runningDate: "Daily",
        classes: [
          { type: "3A", totalSeats: 150, availableSeats: 150, fare: 2500 },
          { type: "2A", totalSeats: 80, availableSeats: 80, fare: 3500 },
          { type: "1A", totalSeats: 30, availableSeats: 30, fare: 5500 }
        ]
      },
      {
        trainNumber: "12007",
        trainName: "Shatabdi Express",
        source: "Bangalore",
        destination: "Chennai",
        departureTime: "06:00",
        arrivalTime: "11:00",
        runningDate: "Daily",
        classes: [
          { type: "CC", totalSeats: 300, availableSeats: 300, fare: 800 },
          { type: "EC", totalSeats: 50, availableSeats: 50, fare: 1600 }
        ]
      }
    ];

    const insertTrain = db.prepare('INSERT INTO trains (trainNumber, trainName, sourceStation, destinationStation, departureTime, arrivalTime, runningDate) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertClass = db.prepare('INSERT INTO train_classes (trainId, type, totalSeats, availableSeats, fare) VALUES (?, ?, ?, ?, ?)');

    sampleTrains.forEach(t => {
      const result = insertTrain.run(t.trainNumber, t.trainName, t.source, t.destination, t.departureTime, t.arrivalTime, t.runningDate);
      const trainId = result.lastInsertRowid;
      t.classes.forEach(c => {
        insertClass.run(trainId, c.type, c.totalSeats, c.availableSeats, c.fare);
      });
    });
  }
}

export default db;
