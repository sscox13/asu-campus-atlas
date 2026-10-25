# Meet Me Halfway for Cubbie

Three classmates, three personal Cubbies, one feasible study session at ASU Tempe.

Text this folder link to your own Cubbie:

https://github.com/sscox13/asu-campus-atlas/tree/main/skills/meet-me-halfway

Approve installation when Cubbie asks. Each teammate installs it independently. Then text:

> Use Meet Me Halfway to find a 60-minute calculus study session at ASU Tempe with Ava, Ben and Maya on Monday afternoon. Include our walking time between classes. Start by checking only my schedule, and ask before sharing anything.

The host's Cubbie creates a request file. The host forwards it to classmates in iMessage; each classmate sends it to their own Cubbie, approves limited sharing, and forwards their ballot back. The host's Cubbie merges ballots. Each personal Cubbie reviews the exact agreement and asks only its own student to confirm. The host collects all confirmations before finalizing.

This is a student-mediated iMessage exchange, not an automatic Cubbie-to-Cubbie messaging API. Cubbie texts its own student. It needs no new API key or backend. A known messaging sender establishes identity; JSON packets are not cryptographically signed. Do not use the browser demo's sample approval buttons as evidence of real student consent.

The AI work happens in each student's Cubbie: understanding the request, reading the student's connected calendar, eliciting missing constraints, explaining counterproposals and obtaining consent. Node scripts calculate reproducible routes and coordinate typed packets.

## Local check

Run `node scripts/agent.mjs --sample`. It uses bundled fictional data, writes no state and obtains no real consent. Local checks passed; installation and a complete exchange on three real Cubbie accounts still need to be tested.

## Three real-device tests

1. All teammates install. Ask for an afternoon session. Forward request → independent ballots → agreement → each student's confirmation → final plan. Check that the real iMessage exchanges are captured for the demo.
2. Give one student a conflicting next class or a zero walking cap. Expect no common plan, or a counterproposal; no automatic relaxation.
3. Confirm two students, then change the meeting details. Expect stale approvals to be rejected and everyone to confirm the new round. Try declining; no final plan should be created.

The Cubbie accounts and connected calendars are per student. No student profile should appear in the forwarded files. Use fictional inputs if demonstrating on a public recording. Venue hours, reservations and accessible routes require separate verification.

Map data © OpenStreetMap contributors, ODbL: https://www.openstreetmap.org/copyright. This is an independent prototype, not affiliated with ASU. Node.js 18+; no npm dependencies.
