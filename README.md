## Slot Booking Backend API

A backend service for managing appointment bookings with proper validation, role-based access, and real-world constraints.

Built to simulate how production systems handle slot creation, booking conflicts, and time-based rules.

---

## What this project does

* Allows **users** to register, login, and book time slots
* Allows **admins** to create and manage slots
* Prevents **double booking using atomic DB operations**
* Enforces **strict time and cancellation rules**
* Provides **clean, structured APIs with proper error handling**

---

## Key Features

### Authentication & Access Control

* JWT-based authentication
* Role-based authorization (admin / user)
* Protected routes using middleware

### Slot Management (Admin)

* Create slots using date, time range, and interval
* Duplicate slot prevention (DB-level + logic)
* View all bookings with user details
* Delete only unbooked slots

### Booking System (User)

* View available slots by date
* Book slots (race-condition safe)
* View own bookings
* Cancel bookings with restrictions:

  * Cannot cancel past slots
  * Must cancel at least 24 hours before

### Time Rules

* No past date bookings
* Same-day booking only if slot is 30+ mins ahead
* All logic handled in **Asia/Kolkata timezone**

---

## API Overview

### Auth

* `POST /api/auth/register`
* `POST /api/auth/login`

### Slots

* `POST /api/slots` (admin)
* `GET /api/slots?date=YYYY-MM-DD`
* `GET /api/slots/bookings` (admin)
* `DELETE /api/slots/:slotId` (admin)

### Bookings

* `POST /api/bookings/:slotId`
* `GET /api/bookings/my-bookings`
* `DELETE /api/slots/:slotId/cancel`

---

## Sample Response

```json
{
  "message": "Slot booked successfully",
  "slotId": "65f1c2...",
  "date": "2026-03-30",
  "startTime": "10:00",
  "endTime": "10:30"
}
```

Error format:

```json
{
  "error": {
    "code": "SLOT_ALREADY_BOOKED",
    "message": "This slot is no longer available"
  }
}
```

---

## Tech Stack

* Node.js
* Express
* MongoDB + Mongoose
* JWT (Authentication)
* Winston (Logging)

---

## Important Implementation Details

* **Atomic booking logic** using `findOneAndUpdate` to prevent race conditions
* **Compound unique index** on `(date, startTime, endTime)`
* **Centralized validation layer** for input + business rules
* **Structured error responses** with error codes
* **Request-level logging with requestId (Winston)** for tracing requests

---

## Project Structure

```
src/
  config/
  controllers/
  middleware/
  models/
  routes/
  utils/
  validators/
  app.js
  server.js
```

---

## Running Locally

```bash
git clone https://github.com/shriram46/Slotify
cd backend
npm install
```

Create `.env`:

```
MONGO_URI=your_mongo_uri
JWT_SECRET=your_secret
PORT=5000
```

Run:

```bash
npm run dev
```

---

## Design Decisions

* Used **MongoDB indexes** instead of only code checks to prevent duplicate slots
* Used **atomic DB update** to handle concurrent booking safely
* Separated **validation logic** from routes for maintainability
* Added **request-level logging** to trace API calls

---

## Purpose

This project demonstrates backend API design, authentication, validation, concurrency handling, and clean architecture for a real-world booking system.
