# Meet Me Halfway

**Pitch:** Your agent knows your day. Their agents know theirs. Together they find a study session everyone can actually walk to.

## Real campus scenario

Three ASU Tempe students need a 60-minute study session between classes. Their agents evaluate Hayden Library, Noble Library and the Memorial Union against separate availability, walking limits and venue preferences. The walking graph and buildings are from the existing Tempe Atlas OpenStreetMap snapshot. All student profiles are fictional and editable.

## Working prototype

Open `agents.html` through an HTTP server or the published GitHub Pages site. Choose **Let the agents work**. Inspect the coordination packets. Try Conflicting calendars and Strict walking limit. Confirm each student to enable calendar export; decline or edit constraints to block/invalidate it.

The browser runs three independent constraint-planning agents and a coordinator. This is a working local coordination demo, not a live LLM-backed messaging deployment. No student accounts, live calendars, iMessage or Discord are connected. The local operator can see and act for every sample student; these demo controls are not authentication or a security boundary.

For the live AI workflow, each teammate installs the [Meet Me Halfway Cubbie skill](https://github.com/sscox13/asu-campus-atlas/tree/main/skills/meet-me-halfway). Cubbie reads only its own student's calendar, evaluates requests with bundled route scripts, and asks for student approval. Students forward request, ballot, agreement and confirmation JSON attachments in iMessage. This is a student-mediated relay, not a Cubbie messaging API. Hashes bind packets to the round but do not authenticate senders; verify senders through known conversations. Local protocol tests passed. A complete real-device Cubbie run has not been observed.

## How agents coordinate

1. Each StudentAgent owns a private profile. The coordinator never receives profile objects.
2. Agents share a coarse availability interval, then evaluate concrete time/venue proposals locally.
3. A ballot contains feasibility, a generic rejection reason, accepted travel estimates and a soft venue-preference penalty. No class locations or private schedule reasons are exchanged.
4. The coordinator enumerates 15-minute starts and ranks feasible proposals by smallest maximum individual walk, then total walking, preference penalty and earlier start. Hard constraints are never relaxed automatically.
5. If no option fits, negotiation stops and asks students to change something.
6. Agent acceptance is feasibility, not student consent. Each student confirms the exact proposal ID. Edits clear approvals. One decline blocks calendar export.
7. Only unanimous confirmation enables a downloadable calendar event. Nothing is sent, booked or added to another person's calendar automatically.

Availability and travel estimates still reveal some scheduling information. This prototype minimizes shared fields; it does not claim anonymity or cryptographic privacy.

## 90-second demo script

- **0–15 seconds:** “Our group keeps saying ‘I'm free,’ but that doesn't mean we can get across campus in time. Each of us has a personal agent.” Show the three sample profiles.
- **15–35 seconds:** Start negotiation. Show the initial time being rejected because travel does not fit. Expand an availability packet and a ballot: no course names or origins.
- **35–55 seconds:** Show the revised feasible plan and each person's actual walking estimate. Explain how minimax walking avoids sending one person across campus for everyone else's convenience.
- **55–70 seconds:** Confirm two students. Calendar export stays disabled. Confirm the third and download the event. No room is booked.
- **70–85 seconds:** Change a constraint to invalidate consent; show an impossible-calendar or strict-walk scenario returning no agreement.
- **85–90 seconds:** “Less group-chat negotiation. More time together.” Show the campus map.

## What remains before a live AI/messaging submission

- Install the included skill on each teammate's own Cubbie and test the student-forwarded iMessage protocol.
- Use authenticated per-student approvals rather than the demo's single-browser controls.
- Test one real three-person coordination exchange; capture evidence, not a reenactment.
- Confirm that your team submitted Track 1. Track 2 eligibility has not been verified here.
- Verify venue opening hours/availability before claiming a real session can take place there. The prototype only proposes venues; it does not reserve rooms.

## Validation

`node test-agents.mjs` (source project) covers time/travel conflicts, missing paths, quiet venues, impossible constraints, minimized packets, unanimous consent, declines, stale approvals and calendar timestamps in Phoenix time. Existing `test-routes.mjs` checks the underlying campus routing.
