# Jane Street Agent Skills: Socratic Tutor

Source: janestreet/agent_skills · MIT · verified 2026-11-22
Repository: https://github.com/janestreet/agent_skills
Baseline: HEAD `469868f4489c` (2026-11-17), repository created 2026-11-03, no releases, one skill, about 7 KB.

## What it is

A small public skill collection from Jane Street. At verification time it contains one skill, `socratic-tutor`, which turns an agent into a strict personal tutor. The skill uses the Socratic method: placement questions, a leveled skill map, one question at a time, spaced review, and a final mixed assessment. The repository states that the skills are exported from Jane Street's internal repository and that new skill contributions are not being accepted.

## Why it matters

- **A complete teaching protocol.** Most "tutor" prompts stop at tone; this one defines placement, progression, evaluation, and completion criteria.
- **Earned levels.** Advancement requires demonstrated performance across independent checks, including unprompted recall. This blocks the common failure where an agent flatters the learner.
- **Persistence hooks.** "Save state" and "resume from:" blocks let a session continue across chats without inventing progress.
- **Small and portable.** One `SKILL.md` works in any agent that supports the common skill format, and the MIT license allows adaptation with attribution.

## Key concepts

- **Diagnostic placement** — 3–5 probing questions across easy to hard, before any teaching.
- **Skill map** — 4–10 subskills tracked at levels 0–5: unaware, heard of it, can follow along, can do with help, independent, can teach.
- **One question at a time** — the message ends after the question; no hints or teaching content is appended.
- **Earned level** — raised only after 2+ independent checks, at least one unprompted.
- **Spaced review** — earlier subskills are re-tested without warning; failure lowers the level.
- **Completion gate** — a final mixed assessment with one question per subskill and one integrative problem.

## Workflow / architecture

1. Confirm the user wants a teaching session, not a one-off answer.
2. Break the topic into subskills and explain that a short diagnostic comes first.
3. Run the diagnostic, show the initial ASCII skill map, and propose a starting point.
4. Loop per subskill: ask, wait, probe wrong answers with narrower questions, and explain directly only after repeated failure.
5. Periodically re-test earlier subskills; adjust levels downward on failure.
6. Finish only when every subskill reaches the target level, then run the final assessment.
7. Use "save state" and "resume from:" for continuity.

## Verified behavior

Read from the repository on 2026-11-22:

- `socratic-tutor/SKILL.md` contains the placement, skill-map, teaching-loop, evaluation, completion, and command sections summarized above.
- `README.md` documents the single skill, how to copy it into an agent's skills folder, and the maintainers' no-new-skills contribution policy.
- `LICENSE.md` is the MIT license.
- Repository metrics at verification time: about 10.6k stars, 737 forks.

No tutoring session was run during verification.

## Limitations

- The skill is a teaching protocol, not evidence about learning outcomes. No evaluation data is published.
- One skill only; there is no breadth beyond Socratic tutoring.
- Strict pacing can frustrate users who wanted a quick explanation. The skill's intent guard only partly mitigates this.
- Domain accuracy still depends on the underlying model and on tools available for exercises.
- The repository explicitly does not accept new skills or text changes, so upstream updates are expected to be rare.

## How the assistant should use it

- Activate the `socratic-tutor` skill when the user asks to be taught, drilled, or quizzed to mastery.
- Do not start the tutoring loop for a one-off "explain X" question.
- Keep the agent's own factual claims verified; the protocol governs teaching behavior, not domain truth.
- For high-stakes domains such as medicine, law, or finance, keep the existing domain limits: teach concepts, do not diagnose or advise, and escalate crisis situations.
- Preserve the MIT notice when copying or adapting the skill.

## References

- https://github.com/janestreet/agent_skills
- https://github.com/janestreet/agent_skills/blob/master/README.md
- https://github.com/janestreet/agent_skills/blob/master/socratic-tutor/SKILL.md
- https://github.com/janestreet/agent_skills/blob/master/LICENSE.md
