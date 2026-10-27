# Testing — RailReserve Train Reservation System

This document describes the testing done on the RailReserve backend API.
The main focus is **black-box testing**; a smaller **white-box** suite complements it.

| | Black-box | White-box | Total |
|---|---|---|---|
| Test cases | 106 | 34 | **140** |
| Passed (feature works as specified) | 93 | 34 | 127 |
| Defects found | 13 | — | **13** |

Code coverage (white-box + black-box together): **100% statements, 100% lines, 96.4% branches**.

---

## 1. How to run

```bash
npm install
npm test                 # all tests
npm run test:blackbox    # black-box tests only
npm run test:whitebox    # white-box tests + coverage report
npm run test:coverage    # all tests + coverage report (HTML in coverage/)
```

**Tools:** Vitest (test runner), Supertest (HTTP requests to the API), @vitest/coverage-v8 (coverage).

**Test environment:** every test file gets a fresh in-memory SQLite database (`DB_PATH=:memory:`),
seeded with the same data as production: 1 admin, 8 stations, 20 trains, 50 train classes.
The real `rail_reserve.db` file is never touched.

---

## 2. Black-box testing

### 2.1 Approach

Black-box tests treat the server as a closed box. They only send HTTP requests to the public API
and check the responses (status code, response body, and the visible effect on other endpoints such
as seat counts). They do not read or depend on the source code.

### 2.2 Techniques used

| Technique | Where it is applied |
|---|---|
| **Equivalence Partitioning (EP)** | Valid vs. invalid registration data, login credentials, search routes, booking input |
| **Boundary Value Analysis (BVA)** | Seat counts around the class capacity (max+1, max, 0 left, min−1), password length 0, age < 0 |
| **Decision Table Testing** | Access control on every admin endpoint (token present × token valid × role) |
| **State Transition Testing** | Booking life cycle: *Confirmed → Cancelled → (cancel again rejected)* |
| **Error Guessing (EG)** | SQL injection, case sensitivity, missing fields, forged/expired tokens, other users' PNRs |
| **Use-Case / Scenario Testing** | Complete passenger journey, admin journey, two users competing for the last seats |

### 2.3 Test result legend

- **Pass** — the system behaves as specified.
- **Fail (Defect)** — the system does not behave as specified. These are written with
  `it.fails(...)` so the suite stays green while the defect exists; once the defect is fixed the test
  turns red and must be changed to a normal `it(...)`.

---

### 2.4 Module: User Registration — `POST /api/auth/register`
File: `tests/blackbox/auth.test.ts`

| ID | Technique | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-REG-01 | EP (valid) | name, unique email, password | 201 "User registered successfully" | 201 | Pass |
| BB-REG-02 | EP (invalid) | Register the same email twice | 400 "Email already exists" | 400 | Pass |
| BB-REG-03a | EP (invalid) | Missing `name` | 400 | 400 | Pass |
| BB-REG-03b | EP (invalid) | Missing `email` | 400 | 400 | Pass |
| BB-REG-03c | EP (invalid) | Missing `password` | 400 | 400 | Pass |
| BB-REG-04 | EP (invalid) | Empty body `{}` | 400 | 400 | Pass |
| BB-REG-05 | EG (security) | Body contains `role: "admin"` | Account created with role `user` | role `user` | Pass |
| BB-REG-06 | EP (invalid) | email = `not-an-email` | 400 | **201** | **Fail (Defect)** |
| BB-REG-07 | BVA | password = `""` (length 0) | 400 | **201** | **Fail (Defect)** |
| BB-REG-08 | EG | `ADMIN@RAILRESERVE.COM` (existing email, different case) | 400 | **201** | **Fail (Defect)** |

### 2.5 Module: Login — `POST /api/auth/login`

| ID | Technique | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-LOG-01 | EP (valid) | admin@railreserve.com / password123 | 200, token + user (role admin) | 200 | Pass |
| BB-LOG-02 | EG (security) | Valid login | Response contains no password hash | No hash | Pass |
| BB-LOG-03 | EP (valid) | Newly registered user logs in | 200, role `user` | 200 | Pass |
| BB-LOG-04 | EP (invalid) | Correct email, wrong password | 401 "Invalid credentials" | 401 | Pass |
| BB-LOG-05 | EP (invalid) | Unknown email | 401 with the **same** message (no user enumeration) | 401 | Pass |
| BB-LOG-06 | EG | Password in wrong case `PASSWORD123` | 401 | 401 | Pass |
| BB-LOG-07 | EG (security) | SQL injection `' OR '1'='1` | 401 | 401 | Pass |
| BB-LOG-08 | Contract | Decode returned JWT | Expires 24 h after issue | 24 h | Pass |

### 2.6 Module: Stations, Train List & Search
File: `tests/blackbox/search.test.ts`

| ID | Technique | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-STN-01 | EP (valid) | `GET /api/stations` without login | 200, the 8 seeded stations | 200, 8 | Pass |
| BB-STN-02 | Contract | Each station object | Has id, stationName, stationCode, city | Yes | Pass |
| BB-TRN-01 | EP (valid) | `GET /api/trains` without login | 200, 20 trains, each with classes | 20 | Pass |
| BB-TRN-02 | Contract | Each class on a fresh system | availableSeats = totalSeats, fare > 0 | Yes | Pass |
| BB-SRCH-01 | EP (one result) | Hyderabad → Visakhapatnam | Godavari Express 12727 with SL, 3A, 2A | As expected | Pass |
| BB-SRCH-02 | EP (many results) | Bangalore → Chennai | Trains 12007 and 12604 | Both | Pass |
| BB-SRCH-03 | EP | Visakhapatnam → Hyderabad (reverse) | Only return train 12728 | 12728 | Pass |
| BB-SRCH-04 | EP (no results) | Tirupati → Kolkata | 200, `[]` | `[]` | Pass |
| BB-SRCH-05 | EP (invalid) | Delhi → Delhi | `[]` | `[]` | Pass |
| BB-SRCH-06 | EP (invalid) | Unknown station "Atlantis" | 200, `[]` | `[]` | Pass |
| BB-SRCH-07 | EP (invalid) | No query parameters | 200, `[]` (no crash) | `[]` | Pass |
| BB-SRCH-08 | EG (security) | SQL injection in source/destination | `[]`, not all trains | `[]` | Pass |
| BB-SRCH-09 | EG | `hyderabad` → `visakhapatnam` (lower case) | 1 train | **0 trains** | **Fail (Defect)** |

### 2.7 Module: Booking — `POST /api/bookings`
File: `tests/blackbox/booking.test.ts`

**Authentication**

| ID | Technique | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-BK-01 | EP (invalid) | No token | 401 | 401 | Pass |
| BB-BK-02 | EG (security) | Token signed with a different secret (fake admin) | 401 | 401 | Pass |
| BB-BK-03 | EG | Expired token | 401 | 401 | Pass |

**Valid bookings**

| ID | Technique | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-BK-04 | EP (valid) | 1 passenger, Godavari SL | 201, PNR like `PNRXXXXXXXX` | 201 | Pass |
| BB-BK-05 | EP (valid) | 4 passengers, 3A | Available seats drop by exactly 4 | −4 | Pass |
| BB-BK-06a | BVA | 1 passenger, 2A (fare 1450) | totalFare 1450 | 1450 | Pass |
| BB-BK-06b | BVA | 2 passengers, 2A | totalFare 2900 | 2900 | Pass |
| BB-BK-06c | BVA | 6 passengers, 2A | totalFare 8700 | 8700 | Pass |
| BB-BK-07 | EG | 10 bookings in a row | 10 different PNRs | 10 unique | Pass |

**Seat-count boundaries** — Rajdhani Express (Return) 22692, class 1A, capacity **25**

| ID | Boundary | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-BK-08 | max + 1 | 26 passengers | 400 "Seats not available", seats stay 25 | 400, 25 | Pass |
| BB-BK-09 | max | 25 passengers | 201, seats become 0 | 201, 0 | Pass |
| BB-BK-10 | 0 left | 1 more passenger | 400, seats stay 0 | 400, 0 | Pass |
| BB-BK-11 | other class | 1 passenger in 2A of the same train | 201 (full 1A does not block 2A) | 201 | Pass |
| BB-BK-12 | min − 1 | 0 passengers (`[]`) | 400 | **201 (0-seat booking created)** | **Fail (Defect)** |

**Invalid input**

| ID | Technique | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-BK-13 | EP (invalid) | Class 1A on Godavari (not offered) | 400 | 400 | Pass |
| BB-BK-14 | EP (invalid) | trainId 99999 (does not exist) | 400 | 400 | Pass |
| BB-BK-15 | EP (invalid) | Missing journeyDate | 400, no seats used | 400, unchanged | Pass |
| BB-BK-16 | EG | 2nd passenger has no name | 400, whole booking rolled back, seats unchanged | 400, unchanged | Pass |
| BB-BK-17 | EG | `passengers` field missing | 400 | **500 (server error)** | **Fail (Defect)** |
| BB-BK-18 | BVA | Passenger age = −1 | 400 | **201** | **Fail (Defect)** |
| BB-BK-19 | EP (invalid) | journeyDate = 2000-01-01 (past) | 400 | **201** | **Fail (Defect)** |
| BB-BK-20 | EP (invalid) | journeyDate = "tomorrow" | 400 | **201** | **Fail (Defect)** |

**My bookings — `GET /api/bookings/my`**

| ID | Technique | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-MY-01 | EP (invalid) | No token | 401 | 401 | Pass |
| BB-MY-02 | EP (valid) | New user | 200, `[]` | `[]` | Pass |
| BB-MY-03 | EP (valid) | After booking 2 passengers in 3A | Train details, both passengers, status Confirmed, fare 1900 | As expected | Pass |
| BB-MY-04 | EG (security) | User B lists bookings after user A books | B sees `[]` | `[]` | Pass |

### 2.8 Module: Cancellation — `DELETE /api/bookings/cancel/:pnr`
File: `tests/blackbox/cancel.test.ts`

**State transition diagram**

```
            book                 cancel                 cancel
 (none) ───────────► Confirmed ───────────► Cancelled ───────────► 400 "Already cancelled"
                                                                    (state unchanged)
```

| ID | Technique | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-CN-01 | State: Confirmed → Cancelled | Book 3 seats, cancel | 200, status Cancelled, all 3 seats returned | As expected | Pass |
| BB-CN-02 | State: Cancelled → cancel | Cancel the same PNR twice | 400 "Already cancelled", seats not returned twice | As expected | Pass |
| BB-CN-03 | State | Cancelled booking | Still listed in booking history | Listed | Pass |
| BB-CN-04 | State | Cancel 1 of 2 bookings | Other booking stays Confirmed | Confirmed | Pass |
| BB-CN-05 | State | Fill class (25/25), cancel, book 25 again | 2nd booking succeeds | 201 | Pass |
| BB-CN-06 | EP (invalid) | Unknown PNR | 404 "Booking not found" | 404 | Pass |
| BB-CN-07 | EG (security) | User B cancels user A's PNR | 404, A's booking stays Confirmed | 404 | Pass |
| BB-CN-08 | EP (invalid) | No token | 401, booking stays Confirmed | 401 | Pass |

### 2.9 Module: Admin
File: `tests/blackbox/admin.test.ts`

**Decision table — access control**

| Rule | Token present | Token valid | Role | Expected |
|---|---|---|---|---|
| R1 | No | – | – | 401 |
| R2 | Yes | No | – | 401 |
| R3 | Yes | Yes | user | 403 |
| R4 | Yes | Yes | admin | 2xx |

Each rule is tested on each of the 6 admin endpoints (24 test cases, all **Pass**):

| Endpoint | R1 | R2 | R3 | R4 |
|---|---|---|---|---|
| `GET /api/admin/users` | 401 ✔ | 401 ✔ | 403 ✔ | 200 ✔ |
| `GET /api/admin/bookings` | 401 ✔ | 401 ✔ | 403 ✔ | 200 ✔ |
| `POST /api/stations` | 401 ✔ | 401 ✔ | 403 ✔ | 201 ✔ |
| `DELETE /api/stations/:id` | 401 ✔ | 401 ✔ | 403 ✔ | 200 ✔ |
| `POST /api/trains` | 401 ✔ | 401 ✔ | 403 ✔ | 201 ✔ |
| `DELETE /api/trains/:id` | 401 ✔ | 401 ✔ | 403 ✔ | 200 ✔ |

**Station management**

| ID | Technique | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-ADM-ST-01 | EP (valid) | Add station CSMT / Mumbai | Appears in public station list | Appears | Pass |
| BB-ADM-ST-02 | EP (invalid) | Duplicate code HYB | 400 | 400 | Pass |
| BB-ADM-ST-03 | EP (invalid) | Missing city | 400 | 400 | Pass |
| BB-ADM-ST-04 | EP (valid) | Delete an existing station | Gone from list | Gone | Pass |
| BB-ADM-ST-05 | EG | Delete station id 424242 (does not exist) | 404 | **200 "Station deleted"** | **Fail (Defect)** |

**Train management**

| ID | Technique | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-ADM-TR-01 | EP (valid) | Add train with SL + 3A | 201, searchable, all seats available | As expected | Pass |
| BB-ADM-TR-02 | Scenario | Book on the newly added train | 201 | 201 | Pass |
| BB-ADM-TR-03 | EP (invalid) | Duplicate train number 12727 | 400 | 400 | Pass |
| BB-ADM-TR-04 | EP (valid) | Delete a train | Gone from listing and search | Gone | Pass |
| BB-ADM-TR-05 | EG | Add train with no `classes` | 400 **and** no train saved | **400, but train is saved anyway** | **Fail (Defect)** |
| BB-ADM-TR-06 | BVA | totalSeats = −5, fare = −100 | 400 | **201** | **Fail (Defect)** |
| BB-ADM-TR-07 | EG | Delete a train that has bookings | Handled response (< 500) | **500 (server error)** | **Fail (Defect)** |

**Reports**

| ID | Technique | Test case / input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| BB-ADM-RP-01 | EG (security) | `GET /api/admin/users` | Includes admin, no password fields | As expected | Pass |
| BB-ADM-RP-02 | EP (valid) | `GET /api/admin/bookings` after a user books | Booking listed with train name, user name, user email | As expected | Pass |

### 2.10 Use-case scenarios
File: `tests/blackbox/scenarios.test.ts`

| ID | Scenario | Steps | Expected result | Status |
|---|---|---|---|---|
| UC-01 | Passenger journey | Register → login → search Hyderabad→Chennai → book 2 SL → view bookings → cancel | Each step succeeds; fare = 2 × SL fare; seats go down by 2, then return to original | Pass |
| UC-02 | Admin journey | Admin adds station Madurai + train 16000 → customer books 3 seats → admin views report | Booking appears in admin report with customer email and fare 750 | Pass |
| UC-03 | Sell-out / concurrency | Train with 3 seats; two users each book 2 seats at the same time | Exactly one 201 and one 400; 1 seat left; never oversold | Pass |

---

## 3. Defect report (from black-box testing)

| # | Test ID | Severity | Module | Description | Suggested fix |
|---|---|---|---|---|---|
| 1 | BB-BK-17 | High | Booking | Request without `passengers` crashes the server with 500 | Validate `passengers` is a non-empty array before use |
| 2 | BB-ADM-TR-07 | High | Admin | Deleting a train that has bookings crashes with 500 (foreign-key error) | Refuse with 409, or cancel bookings first |
| 3 | BB-ADM-TR-05 | High | Admin | Failed "add train" still saves the train without classes (not atomic) | Wrap train + class inserts in `db.transaction` |
| 4 | BB-BK-12 | Medium | Booking | Booking with 0 passengers is accepted | Require at least 1 passenger |
| 5 | BB-BK-19 | Medium | Booking | Journey date in the past is accepted | Reject dates before today |
| 6 | BB-BK-20 | Medium | Booking | Invalid journey date text is accepted | Validate `YYYY-MM-DD` format |
| 7 | BB-BK-18 | Medium | Booking | Negative passenger age is accepted | Require age in a valid range (e.g. 0–120) |
| 8 | BB-ADM-TR-06 | Medium | Admin | Negative seat count / fare accepted | Require totalSeats > 0, fare > 0 |
| 9 | BB-REG-08 | Medium | Registration | Same email in different case creates a second account | Store/compare emails in lower case |
| 10 | BB-REG-07 | Medium | Registration | Empty password accepted | Enforce minimum password length |
| 11 | BB-REG-06 | Low | Registration | Malformed email accepted | Validate email format |
| 12 | BB-SRCH-09 | Low | Search | Search is case-sensitive | Compare with `COLLATE NOCASE` |
| 13 | BB-ADM-ST-05 | Low | Admin | Deleting a non-existent station reports success | Return 404 when no row was deleted |

Note: the web pages already block some of these inputs (required fields, no past dates), but the
API itself does not, so anyone calling the API directly can bypass the checks.

---

## 4. White-box testing (summary)

White-box tests use knowledge of the source code to cover every path and branch.

| File | Tests | What is covered |
|---|---|---|
| `tests/whitebox/middleware.test.ts` | 13 | Every path of `authenticate` (no header, no token part, no scheme, invalid token, wrong secret, valid token) and `isAdmin` (admin, non-admin roles, missing user) |
| `tests/whitebox/handlers.test.ts` | 21 | DB seeding and re-run safety, password hashing, both error branches of register, JWT payload, every branch of booking incl. **transaction rollback**, cancel branches checked in the DB, admin train insert/delete |

**Coverage**

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| app.ts | 100% | 97.9% | 100% | 100% |
| db.ts | 100% | 87.5% | 100% | 100% |
| **All** | **100%** | **96.4%** | **100%** | **100%** |

The only uncovered branches are the `process.env.X || default` fallbacks, which tests always override.
