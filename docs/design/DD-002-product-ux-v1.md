# DD-002 — Product UX & information architecture, v1.0

**Status:** Draft 0.1  
**Date:** 2026-09-02  
**Scope:** stable v1.0, no LLM

## 1. Product statement

A personal academic planner whose default answer is:

> What is happening today, what is next, and what is the best thing to do in my free time?

This is not a generic calendar.

The academic timetable is a strict grid of university pairs. Homework and personal work are planned around that grid.

## 2. Primary UX principle

**The app always opens on Today.**

Week and Semester are secondary planning surfaces.

The user should understand the current day in roughly 2–3 seconds.

Today must answer, in order:

1. What am I doing now?
2. What is next?
3. How much free time do I have?
4. What homework is already planned?
5. If a window is unplanned, what should I do?

## 3. Navigation

Primary navigation:

```text
Today
Week
Tasks
More
```

`More` contains:

```text
Semester
Import / timetable sources
Notifications
Settings
Data export
```

On desktop/Windows this becomes a sidebar. On mobile it is bottom navigation.

## 4. Today screen

Today is a vertical academic timeline, not a generic hourly calendar.

```text
WEDNESDAY, 2 SEPTEMBER
Academic week 1 · odd

09:00 ┌──────────────────────────┐
      │ Mathematical analysis    │
      │ Seminar · room 312       │
10:25 └──────────────────────────┘

10:35 ┌──────────────────────────┐
      │ Programming              │
      │ Lab · room 205           │
12:00 └──────────────────────────┘

             NOW ───────────────

      FREE WINDOW · 1 h 45 min

      Recommended
      ┌──────────────────────────┐
      │ Physics problems 12–18   │
      │ ≈ 45 min · due tomorrow  │
      │                          │
      │ [Plan]  [Another]        │
      └──────────────────────────┘

13:55 ┌──────────────────────────┐
      │ Sports specialization    │
      │ Hall 2                   │
15:20 └──────────────────────────┘

19:00 ┌──────────────────────────┐
      │ HOMEWORK · planned       │
      │ Programming lab          │
      │ 60 min                   │
20:00 └──────────────────────────┘
```

### Rules

- Current position is obvious.
- Past events are visually de-emphasized.
- The next event is prominent.
- University lessons, sport and planned homework use different semantic treatments but share one timeline.
- Empty time is useful UI space, not blank calendar space.
- Recommendations appear inside actual free windows.
- The screen should not require horizontal scrolling.

## 5. Week screen

Week is an academic grid.

```text
          Mon       Tue       Wed       Thu       Fri       Sat
09:00     Math      Physics   —         Math      —         —
10:35     Prog      —         Prog      —         Physics   —
12:10     —         Sport     Econ      —         —         —
13:55     English   Sport     —         Lab       —         —
```

Rows correspond to official pair slots.

### Week-grid principles

- fixed slot rows;
- clear day columns;
- equal card geometry where possible;
- parity differences are visible without opening details;
- subgroup differences are visible;
- no arbitrary vertical event positioning like Google Calendar;
- multi-pair labs span grid rows;
- user can switch `this week / odd template / even template`.

Clicking a cell opens details/editing.

## 6. Semester screen

Semester is deliberately less detailed.

Purpose:

- understand academic week number/parity;
- see exams, tests, major deadlines and breaks;
- jump to a week/day;
- understand workload concentration.

It is not the primary lesson-editing surface.

## 7. Task model

Minimum task fields:

```ts
type Task = {
  id: string;
  title: string;
  subjectId?: string;

  dueAt?: string;
  estimatedMinutes: number;

  priority: 1 | 2 | 3 | 4 | 5;
  difficulty?: 1 | 2 | 3 | 4 | 5;

  splittable: boolean;
  minimumSessionMinutes?: number;

  remainingMinutes: number;

  status:
    | "todo"
    | "planned"
    | "in_progress"
    | "done"
    | "cancelled";
};
```

`remainingMinutes`, not only `estimatedMinutes`, drives planning.

## 8. Planned work session

A task and a planned session are different entities.

```ts
type WorkSession = {
  id: string;
  taskId: string;
  startsAt: string;
  endsAt: string;
  status: "planned" | "done" | "skipped";
};
```

One 180-minute lab may be split into three 60-minute sessions.

A planned session becomes part of Today and receives notifications.

## 9. Free-window calculation

The day resolver combines:

```text
university lessons
+ sport
+ personal fixed events
+ planned work sessions
+ user wake/sleep / allowed-study bounds
```

Then computes intervals large enough for work.

```ts
type FreeWindow = {
  startsAt: string;
  endsAt: string;
  minutes: number;
};
```

Small transition margins can be configured later; v1 may use a simple minimum usable window.

## 10. Recommendation engine v1

No LLM.

Recommendations are deterministic and explainable.

Inputs:

- deadline distance;
- priority;
- remaining time;
- whether a task fits the current window;
- whether it can be split;
- whether work is already planned elsewhere;
- optional difficulty preference.

Conceptual score:

```text
score =
    deadlineUrgency
  + priorityWeight
  + windowFit
  + completionBonus
  + overduePenaltyBoost
  - alreadyPlannedPenalty
  - fragmentationPenalty
```

Exact weights are configuration, not domain logic.

### Hard constraints before scoring

Reject a candidate if:

- task is done/cancelled;
- no remaining work;
- task does not fit and is not splittable;
- free window is shorter than `minimumSessionMinutes`;
- its deadline has already passed and app is configured to require explicit handling.

### Recommendation output

Never show opaque scores to the user.

Show:

```text
Recommended now

Math · problems 12–18
≈ 40 min

Why:
Due tomorrow · fits this window

[Plan]
[Another option]
[Not now]
```

The explanation must be derivable from the deterministic scoring evidence.

## 11. Planning interaction

When user presses `Plan`:

1. default session duration is the best-fit duration;
2. preview placement in the current free window;
3. user confirms or adjusts;
4. a `WorkSession` is created;
5. it immediately appears on Today;
6. local notification is scheduled when supported.

Fast path should be one confirmation.

## 12. Notifications v1

Notification classes:

```text
Lesson soon
Sport soon
Planned homework soon
Schedule changed (after a re-import)
```

Default user controls:

```text
Lessons: 10 min before
Sport: 15 min before
Homework: at start
Quiet hours: configurable
```

Platform strategy:

- Android / Windows Tauri → local scheduled notifications;
- iPhone PWA → v1 may rely on calendar export or Web Push when the push service exists;
- notifications are an adapter, not domain logic.

The domain emits `NotificationIntent`; platform code schedules it.

## 13. Import UX

Import is a first-class setup flow but not part of everyday navigation.

```text
Import timetable
↓
Choose file/source
↓
Detected semester
↓
Choose group
↓
Preview week
↓
Review 3 uncertain entries
↓
Confirm
```

After a later source update:

```text
Timetable update found

2 changes:
• Physics moved Tue 10:35 → Wed 12:10
• Programming room 205 → 419

[Review] [Apply]
```

Never silently overwrite personal changes.

## 14. Visual design direction

The interface should feel structural, not decorative.

Core visual language:

- crisp academic grid;
- strong typographic hierarchy;
- restrained use of color;
- visible alignment to pair slots;
- minimal rounded-card “dashboard” aesthetic;
- information density closer to a well-designed timetable than a consumer calendar.

Color identifies semantics, not decoration:

- university lesson;
- sport;
- planned work;
- warning/change;
- current/next state.

The exact palette is a later visual-system document.

## 15. Desktop / Windows behavior

Windows is not just a stretched mobile UI.

Useful desktop affordances:

- compact Today window;
- optional system tray summary;
- quick action “What should I do now?”;
- keyboard navigation;
- drag a task into a free window;
- app opens directly to Today.

Potential later feature: small always-available “Now / Next / Planned” window.

## 16. Offline-first behavior

After initial import, core v1 works offline:

- Today;
- Week;
- tasks;
- planning;
- recommendations;
- native local notifications;
- manual edits.

Network is needed only for future automatic source updates/sync/push.

## 17. v1 non-goals

Do not add before stable v1:

- LLM/chat;
- automatic natural-language task decomposition;
- social features;
- grades/gradebook;
- notes system;
- Pomodoro suite;
- gamification;
- complex productivity analytics;
- multi-user collaboration.

These are allowed only if the core timetable/planner is already stable.

## 18. v1 success criteria

A successful first stable release lets a student:

1. import their actual university timetable;
2. open the app and immediately understand Today;
3. view the academic week as a strict pair grid;
4. add homework with deadline and estimated duration;
5. receive a useful deterministic recommendation for a free window;
6. turn it into a planned work session;
7. receive notifications;
8. survive a timetable re-import without losing personal data;
9. use the core application offline.
