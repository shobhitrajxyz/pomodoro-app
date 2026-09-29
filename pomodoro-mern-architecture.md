# Pomodoro MERN Application — Architecture

## 1. Project Goal

Build a simple Pomodoro productivity application using the MERN stack:

- **MongoDB** — persistence
- **Express.js** — backend API
- **React** — frontend UI
- **Node.js** — backend runtime

The first version should focus on a clear, understandable Pomodoro timer rather than a large productivity platform.

The application should support:

- Focus sessions
- Short breaks
- Long breaks
- Start
- Pause
- Resume
- Reset
- Manual mode switching
- Automatic transition when a timer finishes

Future features such as authentication, tasks, statistics, notifications, sounds, and user preferences should be designed so they can be added later without making the first version unnecessarily complex.

---

# 2. High-Level Architecture

```text
                    Browser
                       |
                       v
              +----------------+
              | React Frontend |
              +----------------+
                       |
                  HTTP / JSON
                       |
                       v
              +----------------+
              | Express / Node |
              |    REST API    |
              +----------------+
                       |
                       v
                +------------+
                |  MongoDB   |
                +------------+
```

## Responsibilities

### React frontend

Responsible for:

- Rendering the timer
- Handling user interaction
- Maintaining temporary timer state
- Calling backend APIs
- Showing loading/error states
- Displaying user/session data

### Express + Node backend

Responsible for:

- REST API
- Validation
- Business rules that need persistence
- Session/history management
- Communicating with MongoDB

### MongoDB

Responsible for persistent data such as:

- Pomodoro session history
- User preferences
- Tasks in future versions
- User accounts in future versions

---

# 3. Recommended Project Structure

Use a monorepo-style structure:

```text
pomodoro-app/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Timer/
│   │   │   │   ├── Timer.jsx
│   │   │   │   └── Timer.css
│   │   │   ├── ModeSelector/
│   │   │   ├── TimerControls/
│   │   │   └── Header/
│   │   │
│   │   ├── hooks/
│   │   │   └── useTimer.js
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── pages/
│   │   │   └── Home.jsx
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── sessionController.js
│   │   │
│   │   ├── models/
│   │   │   └── Session.js
│   │   │
│   │   ├── routes/
│   │   │   └── sessionRoutes.js
│   │   │
│   │   ├── middleware/
│   │   │   └── errorHandler.js
│   │   │
│   │   ├── services/
│   │   │   └── sessionService.js
│   │   │
│   │   ├── config/
│   │   │   └── db.js
│   │   │
│   │   └── server.js
│   │
│   └── package.json
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Keep the structure simple. Do not create files or abstractions that are not currently needed.

---

# 4. Frontend Architecture

## Main React components

```text
App
 |
 +-- Home
      |
      +-- Timer
      |    |
      |    +-- TimerDisplay
      |    +-- ModeSelector
      |    +-- TimerControls
      |
      +-- SessionSummary
```

The exact component breakdown can be simplified if a component is too small to justify its own file.

## Timer state

The timer should initially be handled on the client.

```js
const modes = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60
};

const [mode, setMode] = useState("focus");
const [timeRemaining, setTimeRemaining] = useState(modes.focus);
const [isRunning, setIsRunning] = useState(false);
```

Do not store a constantly changing countdown value in MongoDB.

The backend should record completed sessions, not every second of the timer.

---

# 5. Timer Logic

The timer flow should be:

```text
User clicks Start
       |
       v
isRunning = true
       |
       v
count down every second
       |
       v
timeRemaining reaches 0
       |
       v
Record completed session
       |
       v
Determine next mode
       |
       v
Reset timer for next mode
```

## Basic Pomodoro sequence

A simple default sequence:

```text
Focus
  ↓
Short Break
  ↓
Focus
  ↓
Short Break
  ↓
Focus
  ↓
Short Break
  ↓
Focus
  ↓
Long Break
```

The implementation should track completed focus sessions so that every fourth completed focus session can lead to a long break.

---

# 6. Data Structure

## Frontend timer state

The frontend only needs:

```text
mode
timeRemaining
isRunning
completedFocusSessions
```

Optional UI state:

```text
isLoading
error
```

## MongoDB Session document

A completed session can look like:

```js
{
  type: "focus",
  duration: 25,
  startedAt: Date,
  completedAt: Date
}
```

Future version:

```js
{
  userId: ObjectId,
  type: "focus",
  duration: 25,
  startedAt: Date,
  completedAt: Date,
  taskId: ObjectId
}
```

Do not add `userId` or `taskId` until authentication/tasks actually exist.

---

# 7. Backend API

For the initial version, keep the API small.

## Create completed session

```http
POST /api/sessions
```

Request:

```json
{
  "type": "focus",
  "duration": 25,
  "startedAt": "2026-09-29T08:00:00.000Z",
  "completedAt": "2026-09-29T08:25:00.000Z"
}
```

Response:

```json
{
  "success": true,
  "session": {
    "id": "...",
    "type": "focus",
    "duration": 25
  }
}
```

## Get session history

```http
GET /api/sessions
```

This can be used later for statistics.

Do not build authentication or complex analytics into the first implementation.

---

# 8. Backend Layers

Use a simple separation:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Model
  ↓
MongoDB
```

Example:

```text
POST /api/sessions
        ↓
sessionRoutes.js
        ↓
sessionController.js
        ↓
sessionService.js
        ↓
Session.js
        ↓
MongoDB
```

The service layer should only be introduced where it actually improves organization. Avoid unnecessary abstraction.

---

# 9. Timer Edge Cases

The implementation must handle:

### Double start

Clicking Start multiple times must not create multiple intervals.

### Pause

Pause must preserve the remaining time.

### Resume

Resume must continue from the paused time.

### Reset

Reset must restore the current mode's original duration.

### Mode switch

Manually switching modes should reset the timer to that mode's configured duration.

### Timer reaches zero

The timer must never become negative.

### Component unmount

The interval must be cleaned up when the React component is unmounted.

### Browser tab inactivity

The first version can use a simple `setInterval`. It does not need advanced background-timer accuracy.

A later version can use timestamps to calculate elapsed time more accurately.

### API failure

If recording a completed session fails, the UI timer should not break. Show an error and allow the user to continue.

---

# 10. Important Architecture Decision

The **timer itself is a frontend concern**.

Do not implement:

```text
Browser → server every second → MongoDB
```

Instead:

```text
Browser
  |
  | timer runs locally
  |
  | session completed
  v
Express API
  |
  v
MongoDB
```

This keeps the application simpler, cheaper, and easier to understand.

---

# 11. Development Order

Build in this order:

## Phase 1 — Project setup

- Create React client
- Create Node/Express server
- Connect MongoDB
- Configure environment variables
- Verify client/server communication

## Phase 2 — Timer

- Display timer
- Start
- Pause
- Resume
- Reset

## Phase 3 — Modes

- Focus
- Short break
- Long break
- Automatic transitions

## Phase 4 — Persistence

- Create Session model
- POST completed sessions
- GET session history

## Phase 5 — UI polish

- Responsive layout
- Visual timer progress
- Clear active mode
- Error/loading states

## Phase 6 — Future features

Only after the above works:

- Authentication
- Tasks
- User settings
- Statistics
- Notifications
- Sound
- Daily goals

---

# 12. Technology Choices

Keep the stack beginner-friendly:

### Frontend

- React
- Vite
- JavaScript
- CSS
- React hooks

### Backend

- Node.js
- Express
- JavaScript

### Database

- MongoDB
- Mongoose

### Development

- npm
- `.env`
- Git

Avoid adding Redux, TypeScript, Docker, Redis, WebSockets, or other infrastructure initially unless there is a concrete need.

---

# 13. Environment Variables

Server:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pomodoro
CLIENT_URL=http://localhost:5173
```

Never commit `.env`.

Commit:

```text
.env.example
```

---

# 14. Coding Principles

The coding agent should:

1. Prefer simple code over clever code.
2. Explain important decisions.
3. Avoid unnecessary abstractions.
4. Keep frontend timer logic separate from persistence logic.
5. Validate API input.
6. Handle errors explicitly.
7. Clean up React intervals.
8. Keep components small and understandable.
9. Use meaningful variable/function names.
10. Build incrementally and verify each phase before moving on.

---

# 15. Definition of Done for MVP

The MVP is complete when:

- React app loads successfully.
- Express server runs successfully.
- MongoDB connection works.
- Timer starts.
- Timer pauses.
- Timer resumes.
- Timer resets.
- Focus/short-break/long-break modes work.
- Timer automatically switches modes.
- Completed focus sessions are saved to MongoDB.
- Session history can be retrieved.
- No duplicate timer intervals are created.
- Timer interval is cleaned up correctly.
- Basic errors are handled.
- Application works on desktop and mobile-sized screens.

---

# Initial Coding Agent Prompt

Copy the following prompt into your coding agent:

```text
You are helping me build a beginner-friendly Pomodoro application using the MERN stack.

IMPORTANT:
I am a beginner. Do not over-engineer the application. Prefer simple, readable JavaScript and explain important decisions briefly.

TECH STACK:
- Frontend: React + Vite + JavaScript
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Styling: plain CSS
- Package manager: npm

GOAL:
Build a simple Pomodoro application with:

1. Focus timer — 25 minutes
2. Short break — 5 minutes
3. Long break — 15 minutes
4. Start
5. Pause
6. Resume
7. Reset
8. Manual mode switching
9. Automatic mode switching when a timer finishes
10. Save completed focus sessions to MongoDB
11. Retrieve session history from the backend

ARCHITECTURE:

pomodoro-app/
├── client/
│   └── React application
├── server/
│   └── Express application
├── .env.example
├── .gitignore
├── package.json
└── README.md

FRONTEND RESPONSIBILITY:

The React frontend owns the live timer.

The timer state should contain approximately:

- mode
- timeRemaining
- isRunning
- completedFocusSessions

Do NOT send a request to the backend every second.

The timer should run locally in React.

When a focus session completes, send one request to the backend to save the completed session.

BACKEND RESPONSIBILITY:

The Express backend should:

- expose REST APIs
- validate incoming session data
- save completed sessions
- retrieve session history
- handle errors
- connect to MongoDB using Mongoose

DATABASE:

Create a Session model similar to:

{
  type: "focus",
  duration: 25,
  startedAt: Date,
  completedAt: Date
}

Do not add authentication, users, tasks, or other fields yet.

API:

POST /api/sessions

Example body:

{
  "type": "focus",
  "duration": 25,
  "startedAt": "2026-09-29T08:00:00.000Z",
  "completedAt": "2026-09-29T08:25:00.000Z"
}

GET /api/sessions

Return the saved session history.

TIMER RULES:

Default sequence:

Focus
→ Short Break
→ Focus
→ Short Break
→ Focus
→ Short Break
→ Focus
→ Long Break

Every fourth completed focus session should be followed by a long break.

Important edge cases:

1. Clicking Start multiple times must not create multiple intervals.
2. Pause must preserve the remaining time.
3. Resume must continue from the paused time.
4. Reset must restore the current mode's original duration.
5. Switching modes manually resets the timer to that mode's duration.
6. Timer must never become negative.
7. React timer intervals must be cleaned up on component unmount.
8. If saving a completed session fails, the timer UI should not crash.
9. Do not store the continuously changing countdown in MongoDB.

IMPLEMENTATION ORDER:

Phase 1:
- Set up the project structure.
- Create React/Vite frontend.
- Create Express backend.
- Add MongoDB/Mongoose connection.
- Add a simple health-check endpoint.
- Verify frontend can communicate with backend.

Stop and explain what was created.

Phase 2:
- Build the timer UI.
- Implement timer state.
- Implement Start/Pause/Resume/Reset.
- Make sure the interval cleanup is correct.

Stop and explain the timer logic.

Phase 3:
- Add Focus, Short Break, and Long Break.
- Add automatic transitions.
- Add the every-fourth-focus-session long-break rule.

Stop and verify the behavior.

Phase 4:
- Create the Mongoose Session model.
- Add POST /api/sessions.
- Add GET /api/sessions.
- Connect the frontend to the API.
- Save completed focus sessions.

Phase 5:
- Improve responsive CSS.
- Add loading/error states.
- Clean up the code.
- Update README with setup and run instructions.

CODING STYLE:

- Use functional React components.
- Use React hooks.
- Use plain JavaScript.
- Use async/await.
- Use meaningful names.
- Keep functions small.
- Avoid unnecessary design patterns.
- Avoid Redux unless there is a real need.
- Avoid TypeScript for this first version.
- Avoid WebSockets.
- Avoid Redis.
- Avoid Docker unless explicitly requested.
- Avoid unnecessary dependencies.

IMPORTANT WORKFLOW:

Do NOT build the entire application in one giant step.

Work phase-by-phase.

After each phase:
1. Tell me what files were created/changed.
2. Explain the important code in beginner-friendly language.
3. Tell me how to run/test that phase.
4. Identify any issues before continuing.

Do not silently make large architectural changes.

If you think a requirement is ambiguous, ask me before implementing it.

Start with Phase 1 only.
```
