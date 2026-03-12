# Safed / gastos-app

Safed is a personal finance application for tracking expenses and income, reviewing spending behavior, and running the same product across web and Android. The project combines manual transaction entry, spreadsheet imports, AI-powered receipt scanning, Android bank notification parsing, and offline-first synchronization.

The repository name is `gastos-app`, while the product name shown in the UI is `Safed`.

## What the app does

Safed is built for users who want a single place to capture financial activity, organize it, and understand it over time. A typical workflow looks like this:

1. Add transactions manually, import them from files, or let Android bank notifications create pending entries.
2. Enrich each movement with category, payment details, notes, recurrence, and budget flags.
3. Review dashboard metrics and statistics to compare actual spending against a monthly goal.
4. Keep using the app while offline and sync queued changes when connectivity returns.

## Feature breakdown

### Transaction management

The app supports full CRUD for both expenses and income. Each transaction can include more than just an amount and description: users can assign a category, icon, date, notes, payment method, card last four digits, recurrence settings, a budget exclusion flag, and a flag to stop future recurring items.

This lets the product work for both quick daily tracking and more structured monthly bookkeeping.

### Monthly goal and recurring payments

Users can define a monthly spending goal and compare current spending against it from the dashboard. Recurring expenses are supported both as monthly items and as period-based repeats, and the dashboard includes a monthly recurring payments card so fixed obligations remain visible.

### Multi-currency support

Safed supports `ILS`, `USD`, `ARS`, and `EUR`. When a movement is created or edited, the app stores converted values so totals can later be displayed in the user's selected currency.

Exchange rates are resolved through `Exchangerate-API`, with `DolarAPI` used for relevant Argentina-specific conversion flows. This means users can record activity in one currency and still analyze their whole account in another.

### Dashboard and analytics

The dashboard is focused on immediate financial visibility. It shows current balance, total income, total expenses, recent activity, and progress against the configured monthly goal.

The statistics area expands that into longer-term analysis, including:

- yearly and monthly statistics views
- monthly spending trends
- top spending categories with charts
- category comparisons and breakdowns
- fixed-versus-variable expense separation

These views are meant to answer both short-term questions, such as "how much have I spent this month?", and trend questions, such as "which categories are growing over time?"

### Import, export, and bulk review

Transaction history can be imported from `xlsx`, `xls`, and `csv` files. The import flow includes manual column mapping and a review step grouped by month before anything is persisted.

The parser supports multiple date formats, including Excel serialized dates, which makes it more tolerant of real-world bank exports and manually maintained spreadsheets. Data can also be exported back to Excel.

For destructive cleanup, the app includes a protected full-delete flow that requires email confirmation.

### Categories and personalization

Safed helps users keep category management lightweight. It can infer or surface categories from historical usage, while still allowing users to create, edit, and hide custom categories.

Users can also customize category icons, switch the UI language between `es` and `en`, and apply UI color personalization. These settings make the app adaptable without changing the underlying finance workflow.

### Account and security

Authentication is handled through Supabase. Sessions are persisted with access and refresh tokens, and the app refreshes sessions automatically before expiration.

From the profile area, users can update their email, change their password, and delete their account.

### AI receipt scanning

If `GROQ_API_KEY` is configured, the app can scan receipts or invoices and extract structured information such as amount, currency, description, suggested category, date, detail, and a confidence score.

This feature is especially useful for users who do not want to type purchases manually. Daily scan usage is limited for non-admin users.

### Android bank notification parsing

The Android build uses Capacitor and includes a native bank notification listener. Instead of sending notifications to an AI model, the project uses regex-based parsing to extract candidate transaction data from supported bank or wallet notifications.

Detected movements can either be stored as pending items for review or auto-saved when the user enables that behavior. The feature is designed around banks and wallet providers used in Israel, Argentina, and some global providers.

This functionality should still be treated as beta because message formats can change and parser coverage depends on the notification source.

### Offline mode and sync queue

Safed keeps local state in IndexedDB so users can continue working without a network connection. Creating and deleting records offline places operations into a pending queue.

When connectivity returns, the user can trigger a manual re-sync. The UI also exposes current online or offline state and the number of queued operations, so sync behavior stays visible instead of implicit.

## Functional status

- The core personal finance experience is operational on both web and Android.
- Android banking sync exists and is usable, but should still be considered beta.
- "Travel mode" may still appear in older parts of the UI history, but it is currently disabled in the profile view and should not be considered an active feature.

## Tech stack

- Frontend: `Next.js 16`, `React 19`, `TypeScript`, modular/vanilla CSS
- Backend: Next.js Route Handlers under `src/app/api`
- Database: `PostgreSQL` with `Prisma`
- Authentication and server-side integrations: `Supabase`
- Mobile runtime: `Capacitor 8` for Android
- Import/export: `xlsx`
- AI integration: `Groq` for receipt scanning

## Environment variables

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://user:password@host:port/dbname"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Optional
DIRECT_URL="postgresql://user:password@host:port/dbname"
GROQ_API_KEY="your-groq-api-key"
```

### Required

- `DATABASE_URL`: primary Prisma connection string
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: server-side key used by protected auth and backend flows

### Optional

- `DIRECT_URL`: useful for some Prisma workflows and deployment setups
- `GROQ_API_KEY`: enables receipt scanning; without it, that feature remains unavailable

## Local development

### Prerequisites

- Node.js and npm
- A PostgreSQL database
- A Supabase project configured for auth

### 1. Install dependencies

```bash
npm install
```

### 2. Sync the database schema

```bash
npx prisma db push
```

### 3. Start the development server

```bash
npm run dev
```

### 4. Run linting

```bash
npm run lint
```

## Useful scripts

### Web

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Android / Capacitor

```bash
npm run patch:android
npm run cap:dev
npm run cap:prod
npm run apk:dev
npm run apk:prod
npm run aab:prod
npm run aab:verify
```

## Deployment

### Web

- The frontend is intended for deployment on Vercel.
- The database is expected to run on PostgreSQL, commonly on Railway.
- The `postinstall` step runs `prisma generate` automatically.

### Android

Prepare the native project:

```bash
npm run cap:prod
```

Build a release bundle:

```bash
npm run aab:prod
```

Verify the signing result:

```bash
npm run aab:verify
```

## Android signing

Release signing can be configured through `android/keystore.properties` or environment variables.

Supported variables:

- `SAFED_UPLOAD_STORE_FILE`
- `SAFED_UPLOAD_STORE_PASSWORD`
- `SAFED_UPLOAD_KEY_ALIAS`
- `SAFED_UPLOAD_KEY_PASSWORD`

If a real upload key is not configured, the pipeline may still produce a bundle, but it will not be suitable for Google Play release.

Step-by-step release notes are available in:

- `reports/V1.0.1/PLAY_RELEASE_STEPS.md`

## Project structure

- `src/app`: App Router pages and route structure
- `src/app/api`: endpoints for auth, user, transactions, categories, notifications, notification parsing, and ticket scanning
- `src/app/components/dashboard`: dashboard UI
- `src/app/components/movements`: transaction list, filters, import/export, and review flows
- `src/app/components/stats`: analytics and financial breakdowns
- `src/app/components/profile`: account settings, monthly goal, categories, sync, and notification settings
- `src/context`: global state, dialogs, language, and session state
- `src/hooks`: session handling, offline sync, bank notification flows, and mobile helpers
- `src/lib`: Prisma, Supabase, bank parser, color system, and IndexedDB helpers
- `prisma`: database schema
- `android`: Capacitor Android project

## Simplified data model

### User

Stores the user profile, monthly goal, role, and relations to transactions, ticket scan usage, and pending notifications.

### Transaction

Stores the description, amount, converted amounts, category, icon, type, date, notes, recurrence, budget flags, payment method, and card last four digits.

### PendingNotification

Stores parsed bank notifications that still need user confirmation before becoming transactions.

### ScanUsage

Stores daily receipt scanning usage for quota enforcement.

## Notes

- The repository still contains some historical or partially reintroduced UI capabilities; this README focuses on what is clearly active or integrated today.
- The visible branding is `Safed`, even though the folder and repository name remain `gastos-app`.
