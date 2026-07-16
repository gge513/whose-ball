# Evernote ore: PM struggles + communication breakdowns (2026-07-15)

> Provenance: mined from George's Evernote (semantic + keyword sweep, notebooks "Life and Ideas" and "AI Manifesto"). Same rules as the motivation ore: this is source material, not shipped decisions. Nothing here enters the v2 delta doc without ratification. Candidate mechanics at the bottom are UNRATIFIED.

## The extracted themes, in George's own material

**1. The illusion of communication.** ("Communication") The Shaw quote George clipped and kept: "The single biggest problem in communication is the illusion that it has taken place." The failure mode is not silence, it is a handoff both sides *believe* happened. Nobody drops the ball on purpose; they never felt it land in their hands.

**2. Blame the people, never the process.** ("Process Flow") "It is highly inordinately difficult for me to understand how people do not concentrate on fixing the process flows - but the people... their process flows do not work by themselves at all and for years too, God knows who does what there and then they have to find scapegoats in people." Also: units have no idea of their weight in the whole; the fight is over whether a meeting started five minutes late instead of ROI.

**3. Work arrives as email and dies there.** ("Adam and Just another Email") "An email comes in. There are 6 tasks in it. We put it aside. An email comes in. We respond to it right away. How are we prioritizing the work we do?" The "just another email" stance means accepting all work orders through a channel with no ownership, no queue, no common place where everybody can work.

**4. Assigned to everybody = owned by nobody.** ("Asana Cleanup") Tasks assigned to the wrong person, tasks assigned to everyone, stale ideas that waffled for months. And the wish at the end: "How does it automatically prioritize things for me?"

**5. Task-driven people can't see what they're blocking.** ("The System Only Works") "If you are task driven you will never pull yourself out of the weeds to see what you are blocking or holding onto." You must commit to the process of work before systems can exist.

**6. Organizations reward firefighters, so prevention is invisible.** ("Problem Solvers" / "Solve Problems Before They Happen") "When we promote problem solvers, we incentivize having problems." Prevention and quiet unblocking earn nothing because "who knows what would have happened?" Plus the captaincy idea: skin in the game, everyone on the boat, learned helplessness as the enemy.

**7. Procrastination is mostly an undefined next action.** (Caveday annual-review PDF) "The second part is that I'm not always sure what I should be doing." Already the spine of harvest decision #2 (the ball is a button); this note is independent confirmation from George's own library.

**8. Make everyone an owner.** ("Product") "Make everyone the owner... every role could be considered a 'product manager.'" Ownership as identity, not assignment.

**9. Workflow, not the work.** ("Skipping Thinking") The recurring instruction to self: focus on the workflow, not the work; the failure is getting back to the things you are sitting with instead of chasing the next new thing.

## Fit check against the ratified frame

The motivation ore already bans activity leaderboards and generic points/badges. Everything below gamifies **verified movement and received communication**, never volume. All candidates ride the existing events table and ball mechanic; none require new infrastructure categories.

## Candidate mechanics (UNRATIFIED building blocks)

**A. The Rally (catch-or-drop handoffs). RATIFIED 2026-07-15 as the signature mechanic.** Early-catch addendum RATIFIED same day: reward with witness, not points. (1) The shipping feed states catch latency in its event language ("caught in 90 minutes"). (2) Momentum page gets a collective "median catch time this week" tile. Both are display-only on timestamps the catch event already carries. PARKED: per-project "hot rally" visual state, badge-adjacent, threshold unknowable pre-pilot; revisit with real catch-time data. Attacks theme 1 head-on. Passing the ball puts it *in the air*; it is not the receiver's until they *catch* it, and catching requires naming their first action (one field). Uncaught for 24h = a visible *drop* on the project, no-fault, cause-typed. Projects accumulate a **rally count**: consecutive clean catches without a drop. The momentum page celebrates the cohort's longest live rally. Gamifies communication-that-actually-landed; on-name for Whose Ball; nothing like it in a normal PM tool.

**B. Assists (the save is the scored act). RATIFIED 2026-07-15.** Assist logged when a blocker naming you as unblocker clears; converts when the unblocked task ships. Visible on member pages (assists + conversions) and narrated in the feed. Farming accepted as low-risk: conversions require a real ship. Attacks theme 6. When a blocker you were named on gets cleared, the event feed logs an **assist** to you, with a chain: assist → unblocked task ships → the assist is *converted*. Member pages show assists and conversions, never task counts. Makes prevention/help visible where organizations normally make it invisible.

**C. Dead-ball whistle with cause-typed pickup. PARKED 2026-07-15 with a Friday trigger:** if Rally and Assists are landed and verified on prod by Friday (Jul 17) morning, pull this back into scope; otherwise it leads the pinned public roadmap. Do not ship a stripped whistle-plus-cause version without the routed remedies. Attacks themes 4 and 7. A ball motionless N days triggers the referee (existing whistle mechanic) with a forced one-tap cause: next action unclear / too big / missing skill / waiting on someone / actually moving. Each cause routes to a different one-click remedy (define it, split it, ask for help, name the unblocker, link the evidence). The intervention matches the cause, per the ore's anti-feature note.

**D. Possession view. RATIFIED 2026-07-15.** Strip on /me: balls you hold that others are waiting on, capped at top three, ranked by wait time (the relational signal), private, never scored. Empty state does the motivational work ("Nothing waiting on you. Clean hands."). Attacks theme 5. A member page strip: every ball you are currently holding *that someone else is waiting on*, ranked by how long they've waited. "You are blocking 2 people" as a first-class, private-to-you signal. Not scored, just seen.

## Voice frame (RATIFIED by George, 2026-07-15)

Three decisions locked in serial, B / B / A:

1. **Where the voice lives: B.** The DFW-informed voice lives in the weekly narrative and the momentum page only. Mechanic microcopy stays plain and functional.
2. **Vocabulary depth: B.** Only the words the mechanics earn (rally, catch, drop, assist, hold). No decorative tennis lexicon (no deuce, no break point, no unforced error).
3. **DFW presence: A.** Named and quoted. One real epigraph in the README/thesis, candidate: "Beauty is not the goal of competitive sports, but high-level sports are a prime venue for the expression of human beauty" (Federer essay). Voice is Wallace-informed, never Wallace-imitating.

The mapping that justifies it (argument, not decoration): the Michael Joyce essay (the unseen grind of the near-great) is the case for Assists; "Federer Moments" (witnessed beauty, never ranked) is the case for the shipping feed with no rank anywhere; "chess on the run" (the game is only the next stroke) is the case for the ball-as-button; the rally as the living unit of the game is the case for catch-or-drop.

Drafting of actual narrative voice and epigraph placement waits until the mechanic walk-through below settles which words are earned.

## Not doing (from this sweep)

- Points, XP, coins, badges for activity: banned by the ratified frame.
- Public individual rankings of any kind: banned (harvest decision #4).
- Email ingestion (theme 3): real pain, wrong week; the cohort's work arrives via GitHub, not Gmail. Park for post-pilot.
- Project "weight"/ROI surfacing (theme 2): operator-phase idea, not a 30-second smoke-test feature.
