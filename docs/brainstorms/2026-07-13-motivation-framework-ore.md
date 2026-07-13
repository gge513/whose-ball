# Motivation framework ore (verbatim, 2026-07-13)

> Provenance: George mined his life's work for what else applies to the PM platform; this synthesis is the result. Treated as synthesis, not shipped words: every adoption below goes through ratification. Harvest decisions live in the v2 delta doc; this file is the untouched source.

---

## The right reframing

You are not trying to build another project-management tool with motivational features.

You are trying to answer:

What conditions help capable people repeatedly turn intention into shipped work, especially when the work is difficult, voluntary, social, and time-constrained?

The platform is the practical expression of that answer.

A useful product thesis is:

Make meaningful progress easier to see than unfinished work, and make the next useful action easier to choose than avoidance.

## A research-backed motivation model

Five conditions (our framework, not the name of an established academic model):

### 1. Meaning

People are more motivated when they understand the significance of the work and can identify a complete contribution rather than performing fragmented activities. The Job Characteristics Model emphasizes task identity and task significance; software-engineering research repeatedly identifies problem-solving, technical challenge, learning, and benefiting others as developer motivators.

Product implication: every project and major task should answer: Who benefits? What changes when this ships? What does "finished" look like? How does this task contribute to the larger project?

A card titled "Add authentication" is weak. Better: "Enable every cohort member to securely access their own projects and review obligations."

### 2. Agency

Self-Determination Theory: autonomous motivation is supported by autonomy, competence, and relatedness. Autonomy does not mean no constraints; it means legitimate choice and ownership within the constraints.

Product implication: distinguish Required outcomes (what must ship) / Chosen approach (how) / Personal commitment (what the developer commits to next). Do not have the platform constantly assign and command. Let people claim work, propose milestones, choose implementation paths, revise plans transparently.

### 3. Mastery

People need evidence they are becoming more capable: timely feedback, appropriately challenging work, enough structure to recognize improvement. Goal-setting research: specific, challenging goals improve performance when ability, commitment, feedback, and resources exist. For complex or unfamiliar work, learning goals can beat immediate performance demands.

Product implication: track what capability was demonstrated, not only completion (deployed a production app; added automated tests; resolved an auth defect; reviewed another developer's architecture; improved docs after fresh-clone testing). Feedback must be actionable: "Your setup requires an undocumented environment variable" beats "Needs work."

### 4. Momentum

The progress principle: visible progress in meaningful work has a particularly strong relationship with positive inner work life and ongoing motivation. Clear goals, adequate resources, and removing obstacles are catalysts; ambiguity and preventable blockers inhibit.

Product implication: the basic unit is not the task; it is the next shippable movement. Each active project shows: current objective; most recent meaningful progress; one clear next action; current blocker; owner of the blocker; time since last movement; evidence required to call the stage complete.

Reward movement in the work, not activity performed around the work (progress, not applause).

### 5. Mutuality

Relatedness is central in Self-Determination Theory. Accountability is relational: people respond differently when commitments affect recognizable peers rather than an abstract management system.

Product implication: make the social consequence of work visible without surveillance. Examples: "Jordan is waiting for your API contract." "Three reviewers need your deployment URL." "You unblocked two cohort members this week." "This issue has no reviewer." "Your review identified a setup defect that was subsequently fixed." Recognition tied to contribution, assistance, learning, and shipping, not raw volume.

## The behavioral gap the platform must solve

Goals alone are insufficient. Implementation-intention research: specifying an if-then plan linking a recognizable situation to a specific action helps translate intention into action (meta-analysis over 94 tests, medium-to-large effect on goal attainment).

Instead of "What are you working on?", ask: "When will you next work on this, and what exact action will you begin with?"

Example: "When I begin tomorrow's work block, I will deploy the current branch and resolve the first production error before adding another feature." More operational than a due date.

## A possible workflow model

To do / In progress / Done is too shallow for this cohort. Consider:

1. **Define** — state the user, outcome, constraints, and completion evidence.
2. **Commit** — choose the next action and intended work period.
3. **Build** — create the implementation.
4. **Verify** — test, review, fresh-clone, inspect production.
5. **Ship** — deploy and submit the pull request.
6. **Teach** — document the architecture, choices, limitations, lessons.

Quality and knowledge transfer become part of the work, not cleanup after "done."

## Core platform experiences

**Personal command center.** Not an enormous task list. Answers immediately: What matters most now? What is my next concrete action? What is blocked? Who is depending on me?

**Project trajectory.** Movement over time: milestones reached, decisions made, decisions unresolved, blockers encountered and cleared, verification evidence, scope changes, current confidence in the deadline. A project narrative, not a static Kanban board.

**Cohort progress.** Collective progress without a humiliation machine: projects deployed; projects passing fresh-clone verification; PRs open; PRs eligible for merge; reviews completed; unresolved blockers; members currently requesting help. Default = cohort momentum, not individual rank.

**Peer-review system.** First-class workflow: assigned or outstanding submissions; deployment checked; PR read; GitHub issue filed; private vote recorded as complete without displaying the vote; review quality prompts; conflicts and self-review restrictions; review debt and approaching deadlines. Completion matrix useful; private-vote content stays private.

**Help and unblock system.** A blocker should not sit invisibly inside a task. Each blocker: what was attempted; what happened; relevant error or evidence; what kind of help is needed; who can help; when it became blocked; whether the next step remains under the developer's control. Asking for help becomes productive work, not an admission of failure.

## What not to build

**Avoid activity leaderboards.** Lines of code, commit counts, hours logged, tasks closed: easily gamed, weakly connected to meaningful progress.

**Avoid generic points and badges as the primary motivation system.** Gamification research is mixed; systematic work documents negative effects from points, badges, competition, leaderboards (irrelevance, gaming, reduced motivation, worsened performance). Learners prefer mechanics directly connected to progress and constructive feedback. Design principle: visualize progress; do not manufacture importance.

**Avoid constant status reporting.** If people must repeatedly explain their work to satisfy the platform, the platform becomes an additional manager. Updates should emerge from normal actions: commits, PRs, deployments, reviews, blocker changes.

**Avoid treating all overdue work the same.** A project can be motionless because: the next action is unclear; the task is too large; a capability is missing; a dependency is unresolved; confidence is lost; or the work is moving but undetected. The intervention should correspond to the cause.

## Early product hypotheses (test, don't bake in)

| Hypothesis | Possible mechanism | Measurement |
| --- | --- | --- |
| Clear next actions reduce stalled projects | Lower ambiguity and activation cost | Time from update to next work event |
| Visible small wins increase persistence | Progress principle | Update frequency and completion rate |
| Explicit blocker ownership shortens delays | Faster social coordination | Median blocker age |
| Meaningful peer recognition increases helping | Relatedness and contribution visibility | Help requests resolved |
| Learning goals improve difficult early-stage work | Mastery before performance | Revision quality and successful verification |
| Implementation commitments improve follow-through | If-then planning | Planned versus completed work sessions |
| Public ranking decreases some participants' motivation | Controlling comparison and status threat | Engagement and self-reported agency |

## Metrics worth collecting

Measure the work system, not worker busyness: time to first meaningful action; time from project creation to first production deployment; % of active projects with a clear next action; median blocker age; time between meaningful progress events; % of milestones with verification evidence; fresh-clone success rate; review completion and reciprocity; help requests resolved; projects that recover after stalling; self-reported clarity, agency, competence, connection. Do not optimize for session time, clicks, comments, or task volume.

## The research and build sequence

- **Stage 1:** Define the theory of motivation: Meaning, Agency, Mastery, Momentum, Mutuality.
- **Stage 2:** Study the cohort's failure modes (interviews around actual behavior: last project you failed to finish; the moment movement stopped; what you knew you should do but didn't; what makes asking for help difficult; what public progress motivates vs embarrasses; when competition improves vs distorts; what information would have enabled earlier intervention).
- **Stage 3:** Choose one primary behavioral outcome. Recommendation: increase the percentage of participants who always know and complete their next shippable action.
- **Stage 4:** Build the smallest complete loop: define a meaningful outcome; commit to a next action; record visible progress; surface blockers; receive peer help or feedback; verify and ship; reflect on what was learned. Everything else is secondary.

## The core concept

The strongest version of this product is not a better container for tasks. It is an operating system for turning intention into shared, visible, verifiable progress.

Next step: a one-page product thesis using this framework: target behavior, design principles, core workflow, explicit anti-features.
