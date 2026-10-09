# Waypoint

A single-page application built with **Angular 22** and a small **Node.js + TypeScript** REST API.
Users sign in with a user ID, password and role. General users see their own records; admins see
every record and manage the user accounts.

## What the brief asked for, and where it lives

| Requirement | How it is met | Main files |
| --- | --- | --- |
| Login page with User ID, Password, Role | Reactive form; the API checks all three and returns a signed token | `client/src/app/features/login`, `server/src/routes/auth.routes.ts` |
| Dummy API that stores and returns data | Express API with four interchangeable stores: **local XML file** (default), local JSON file, **MongoDB** and **AWS DynamoDB** | `server/src/storage` |
| Logged-in page shows user details | "Your details" card, loaded from `GET /api/auth/me` | `client/src/app/features/dashboard` |
| Records in a table, showing access level | Sortable, filterable table from `GET /api/records`; the server filters by role | `dashboard/components/records-table.*`, `server/src/routes/records.routes.ts` |
| Admin can manage users in the DB | Users page: add, edit, change role, reset password, remove | `client/src/app/features/admin`, `server/src/routes/users.routes.ts` |
| API delay via a parameter | Every endpoint accepts `?delay=<ms>`; pick the value in the app header | `server/src/middleware/delay.ts`, `core/interceptors/delay.interceptor.ts` |
| Show async processing on page load | Two parallel requests, skeleton placeholders, a progress bar and a live "API activity" log | `dashboard/dashboard.ts`, `core/services/api-activity.service.ts` |
| User Service | All user API calls in one injectable service | `core/services/user.service.ts` |
| App load | The session is restored before the first page is drawn | `app.config.ts` (`provideAppInitializer`), `core/services/auth.service.ts` |
| Modular code | `core` / `shared` / `features` folders, every page lazy loaded | `app.routes.ts` |

## Run it

You need **Node.js 22.22.3 or newer** (24.15+ also works). Angular 22 will not start on older versions.

```bash
npm run setup     # installs the root, server and client packages
npm run dev       # starts the API on :3000 and the app on :4200
```

Open <http://localhost:4200>. No database setup is needed: by default data is kept in the XML file
`server/data/db.xml`, which is created with demo data on first start.

### Demo accounts

| User ID | Password | Role |
| --- | --- | --- |
| `deepak` | `Admin@123` | Admin |
| `deep` | `User@123` | General User |

The role chosen on the login page must match the account's role, otherwise sign-in is refused.

### Choose where data is stored

The API reads one setting, `STORAGE`, from `server/.env` (copy `server/.env.example` to start).
The Angular app is identical in every case, and `GET /api/health` reports which store is active.
An empty store is filled with the same demo data on first start.

| `STORAGE` | Where data goes | Setup |
| --- | --- | --- |
| `xml` (default) | `server/data/db.xml` | None |
| `json` | `server/data/db.json` | None |
| `mongo` | MongoDB | Set `MONGO_URI` to a local MongoDB or an Atlas connection string |
| `dynamo` | AWS DynamoDB | See below |

**DynamoDB on AWS.** Set `STORAGE=dynamo` and `AWS_REGION`, and provide credentials the standard
way (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, `aws configure`, or an IAM role). The API creates
two on-demand tables, `waypoint-users` and `waypoint-records`, each with one global secondary index,
the first time it starts. The credentials need `dynamodb:CreateTable`, `DescribeTable`, `GetItem`,
`PutItem`, `UpdateItem`, `DeleteItem`, `Query`, `Scan` and `BatchWriteItem` on those tables.

**DynamoDB without an AWS account.** A local emulator is included for trying it out:

```bash
cd server
npm run dynamo:local                 # terminal 1: emulator on http://localhost:8000
# in .env:  STORAGE=dynamo  and  DYNAMO_ENDPOINT=http://localhost:8000
npm run dev                          # terminal 2
```

## API

All routes are under `/api`. Every route accepts `?delay=<milliseconds>` (capped at 10 000).

| Method | Route | Who | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | anyone | Status and active storage |
| POST | `/auth/login` | anyone | `{ userId, password, role }` → `{ token, user }` |
| GET | `/auth/me` | signed in | Details of the current user |
| GET | `/records` | signed in | Admin: all records. General user: own records at "General" level |
| GET | `/users` | Admin | List users |
| POST | `/users` | Admin | Create a user |
| PUT | `/users/:id` | Admin | Edit a user (password optional) |
| DELETE | `/users/:id` | Admin | Remove a user and their records |

Errors always have the shape `{ "message": "...", "details": [...] }` with a matching HTTP status
(400 invalid input, 401 not signed in, 403 wrong role, 404, 409 duplicate user ID).

## How the code is organised

```
server/src
  index.ts            starts the server
  app.ts              builds the Express app (middleware + routes)
  config.ts           settings read from environment variables
  models.ts           User and Record types
  seed.ts             demo data for an empty database
  middleware/         auth (JWT + role check), delay, error handling
  routes/             auth, records, users
  storage/
    data-store.ts     the interface every store implements
    file-store.ts     shared logic for single-file stores (in-memory copy, safe writes)
    xml-store.ts      local XML file (default)
    json-store.ts     local JSON file
    mongo-store.ts    MongoDB
    dynamo-store.ts   AWS DynamoDB

client/src/app
  app.config.ts       providers: router, HTTP interceptors, app initializer
  app.routes.ts       lazy-loaded routes and their guards
  core/               app-wide singletons
    models/           TypeScript types shared across features
    services/         AuthService, UserService, RecordService, LatencyService, ApiActivityService
    interceptors/     auth token, delay parameter, activity log
    guards/           authGuard, guestGuard, roleGuard
    utils/            error messages, safe browser storage
  shared/             reusable pieces with no business logic (logo, confirm dialog, activity list, pipe)
  features/
    login/            sign-in page
    shell/            header and layout for signed-in pages
    dashboard/        profile, access level, records table
    admin/            user management (separate lazy bundle)
```

## Design decisions

**Storage behind an interface.** Routes depend on `DataStore`, not on a database. The XML, JSON,
MongoDB and DynamoDB stores implement the same methods, so the choice is one environment variable
and no route or Angular code changes. The two file stores share one base class and differ only in
how they turn data into text.

**DynamoDB modelled for its access patterns.** DynamoDB only finds items by key, so each table has a
global secondary index for the lookup the app needs: `userId` on users (login) and `ownerId` on
records (a user's records). Writes use condition expressions so a create never overwrites and an
update never creates. Billing is on-demand, so an idle demo costs nothing.

**Access control is enforced on the server.** The Angular guards only decide which pages to show.
The API re-reads the user on every request and applies the role there, so a general user who calls
`/api/users` directly still gets 403, and a role change takes effect immediately.

**Passwords and tokens.** Passwords are stored as bcrypt hashes and never sent to the browser.
Login returns a JWT that the auth interceptor attaches to each request. It is kept in
`sessionStorage`, so it survives a refresh and is gone when the tab closes.

**Signals for state, RxJS for requests.** Services return Observables from `HttpClient`. Pages turn
them into signals with `rxResource`, which gives `isLoading()`, `error()` and `value()` for each
request without manual subscriptions. The app runs zoneless with `OnPush` components.

**Making async visible.** The dashboard starts the profile and records requests together. Each card
has its own skeleton, error and loaded state. An HTTP interceptor logs every call into
`ApiActivityService`, which feeds the header progress bar and the "API activity" panel - with a
1.5 s delay you can watch both requests pending at once and finishing in about 1.5 s total, not 3 s.

**App load.** `provideAppInitializer` runs `AuthService.restoreSession()` before the first render,
so guards never see a half-initialised state. A lightweight splash in `index.html` covers that wait.

## Possible next steps

- Unit tests for the services, guards and API routes
- Deploy the API to AWS (Lambda + API Gateway) with the DynamoDB store, and host the Angular build on S3 + CloudFront
- Refresh tokens in httpOnly cookies instead of a token in `sessionStorage`
- Paging and server-side filtering for large record sets
