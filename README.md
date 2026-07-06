# HabitWebApp

A personal task tracker. Each day shows the tasks due that day — daily, weekly,
biweekly, or monthly — and you check them off, MacroFactor-style. Every check-off
is stored per date, so streaks and history come for free.

Built with the same infrastructure as
[CookBookWebsite](https://github.com/asaifuddin18/CookBookWebsite): Next.js on
Vercel, AWS DynamoDB behind IAM/OIDC roles, defined with AWS CDK and deployed by
GitHub Actions.

---

## Architecture

```
Browser
  └── Vercel (Next.js 15 App Router)
        ├── UI (Today view, task manager)
        ├── API routes (serverless)
        │     └── DynamoDB ──► AWS  (via habit-vercel-app role, OIDC)
        └── Auth (NextAuth.js + Google OAuth)

Infra (AWS CDK v2, deployed by GitHub Actions)
  ├── DynamoDB: habit-tasks, habit-completions
  └── IAM roles: habit-vercel-app, habit-github-actions-deploy (OIDC)
```

## Stack

| Layer          | Technology                    |
| -------------- | ----------------------------- |
| Framework      | Next.js 15 (App Router)       |
| Language       | TypeScript                    |
| Styling        | Tailwind CSS v4               |
| Auth           | NextAuth.js v4 + Google OAuth |
| Database       | AWS DynamoDB                  |
| Infrastructure | AWS CDK v2                    |
| Hosting        | Vercel                        |
| CI/CD          | GitHub Actions (CDK deploy)   |

## Project structure

```
/
├── habit/                    # Next.js app
│   ├── app/
│   │   ├── page.tsx                       # Today view
│   │   ├── layout.tsx
│   │   ├── auth/signin/                   # Sign-in page
│   │   ├── tasks/                         # Manage tasks (list, new, edit)
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/        # NextAuth handler
│   │   │   ├── tasks/route.ts             # GET all, POST create
│   │   │   ├── tasks/[id]/route.ts        # GET, PUT, DELETE
│   │   │   └── completions/route.ts       # GET by date/range, POST toggle
│   │   └── components/                    # React components
│   └── lib/
│       ├── types.ts                       # Shared types
│       ├── validation.ts                  # Zod schemas
│       ├── dynamodb.ts                    # DynamoDB client + queries
│       ├── recurrence.ts                  # "is this task due on date X?" engine
│       ├── describe.ts                    # Human-readable schedule labels
│       ├── awsCredentials.ts              # OIDC / local credential resolver
│       ├── auth.ts                        # NextAuth config
│       └── session.ts                     # Server-side user id helper
└── infra/                    # AWS CDK stack
    ├── bin/infra.ts
    └── lib/habit-stack.ts
```

## Data model

**`habit-tasks`** — one item per recurring task.
`PK userId` (Google account subject) · `SK taskId`.
Holds title, frequency (`daily` | `weekly` | `biweekly` | `monthly`), and the
frequency config (`daysOfWeek`, `dayOfMonth`, `anchorDate`).

**`habit-completions`** — one item per (task, date) you checked off.
`PK userId` · `SK "<YYYY-MM-DD>#<taskId>"`.
A day's completions are a single `begins_with(sk, "<date>#")` query; a date range
(for streaks/heat-maps) is a `BETWEEN` query.

Which tasks appear on a given day is computed by `lib/recurrence.ts`, not stored —
so changing a task's schedule instantly changes past and future days without a
backfill.

---

## Setup

The code is ready to run. The steps below are the one-time account/credential
setup only you can do (AWS console, Google console, Vercel). Reuse the **same AWS
account** as CookBookWebsite — all resources here are prefixed `habit-` so nothing
collides.

### 1. AWS — deploy the infrastructure

The GitHub Actions workflow deploys the CDK stack automatically, but the very
first deploy needs the two OIDC providers to exist (they already do, created by
CookBook) and a one-time CDK bootstrap (already done if CookBook deployed to this
account/region).

Add one GitHub Actions secret so CI can assume the deploy role:

- `AWS_DEPLOY_ROLE_ARN` = the ARN of `habit-github-actions-deploy`

Chicken-and-egg: that role is created *by* this stack. Bootstrap it once locally:

```bash
cd infra
npm install
npx cdk deploy   # uses your local AWS admin credentials, one time only
```

After this, note the stack outputs (`VercelAppRoleArn`, `GithubDeployRoleArn`) and
never deploy by hand again — push to `main` and let GitHub Actions do it.

> The GitHub deploy role trusts `repo:asaifuddin18/HabitWebApp:*`. The Vercel role
> trusts the Vercel project `habit-web-app`. If your repo or Vercel project uses a
> different name, pass it via context, e.g.
> `npx cdk deploy -c githubRepo=asaifuddin18/HabitWebApp -c vercelProject=habit-web-app`.

### 2. Google OAuth

In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services →
Credentials → **Create OAuth client ID** (Web application):

- Authorized JavaScript origins: `http://localhost:3000` and your Vercel URL
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://<your-vercel-domain>/api/auth/callback/google`

Copy the client ID and secret.

### 3. Local development

```bash
cd habit
npm install
cp .env.local.example .env.local
# fill in NEXTAUTH_SECRET (openssl rand -base64 32), GOOGLE_CLIENT_ID/SECRET
# set AWS_PROFILE=habit (a named profile with access to the habit-* tables)
npm run dev
```

### 4. Deploy the app to Vercel

Import the repo in Vercel and set the **Root Directory** to `habit`. Add env vars:

```
NEXTAUTH_URL      = https://<your-vercel-domain>
NEXTAUTH_SECRET   = <random secret>
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
AWS_ROLE_ARN      = <habit-vercel-app role ARN from CDK output>
AWS_REGION        = us-east-1
```

Enable Vercel's AWS OIDC integration for the project so `AWS_ROLE_ARN` can be
assumed at runtime (same setup as CookBook). Do **not** set `AWS_PROFILE` on Vercel.

---

## Environment variables

| Variable                | Local            | Vercel |
| ----------------------- | ---------------- | ------ |
| `NEXTAUTH_URL`          | ✓                | ✓      |
| `NEXTAUTH_SECRET`       | ✓                | ✓      |
| `GOOGLE_CLIENT_ID`      | ✓                | ✓      |
| `GOOGLE_CLIENT_SECRET`  | ✓                | ✓      |
| `AWS_PROFILE`           | ✓                | —      |
| `AWS_ROLE_ARN`          | —                | ✓      |
| `AWS_REGION`            | ✓                | ✓      |
| `HABIT_TASKS_TABLE`     | optional         | optional (defaults to `habit-tasks`) |
| `HABIT_COMPLETIONS_TABLE` | optional       | optional (defaults to `habit-completions`) |
