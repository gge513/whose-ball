# Sandbox: a sealed copy of the app for hands-on testing

A disposable `whose_ball_sandbox` database on the same Neon project, seeded
with a fictional supporting cast so every mechanic (catch, whistle pickup,
blocker/assist, define gate, review-then-vote) has a live instance to drive.
Nothing done here touches production or its feed.

The scripts hard-refuse any database whose path isn't `whose_ball_sandbox`
(setup/seed) and read the prod URL only to derive the sandbox URL.

```bash
# 1. create the sandbox DB + apply all migrations (drops any existing one)
node scripts/sandbox/sandbox-setup.mjs

# 2. seed the cast (refuses a non-empty DB — rerun setup first for a clean slate)
node scripts/sandbox/sandbox-seed.mjs

# 3. run the app against it (env var overrides .env.local)
DATABASE_URL="$(node -e "const{readFileSync}=require('fs');const u=new URL(readFileSync('.env.local','utf8').split('\n').find(l=>l.startsWith('DATABASE_URL=')).slice(13).trim());u.pathname='/whose_ball_sandbox';console.log(u.href)")" npm run dev
```

Sign in with the email door (GitHub OAuth's callback points at prod):
`george@emilywhiteheadfoundation.org` / `pilot-sandbox`.

Tear down from any Neon-connected shell: `DROP DATABASE whose_ball_sandbox WITH (FORCE)`.

Note: the seed intentionally includes one state the real forms can't produce
(a held ball with no next action) — it's what exposed tune-list #2, and it
stays until that server-side guard ships.
