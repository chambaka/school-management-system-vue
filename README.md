# ShuleHub (Vue PWA)

White-label frontend for the Chambaka school management API. Theme name **ShuleHub**: ink navy `#06101F`, gold `#F5C451`, teal `#2EE6C8`, magenta `#FF4D8D`.

Sibling of the Spring Boot backend at `../school_management_system`.

---

## Stack

| Layer | Choice |
| --- | --- |
| UI | Vue 3 |
| Build | Vite 7 |
| State | Pinia |
| Routing | Vue Router |
| PWA | `vite-plugin-pwa` (auto-update service worker) |
| API | `fetch` wrapper in `src/api/http.js` (JWT + refresh, `X-Correction-Id`) |

Dev server: **http://localhost:5173**. Vite proxies `/api` → `http://localhost:8989`.

---

## Tenancy

Same hierarchy as the API:

```
SUPER_ADMIN  →  many tenants
HEADMASTER   →  many schools (organization)
School       →  one or more campuses
```

The UI reads `GET /api/v1/public/config` at startup.

**Multi** (default): Register (`/register`) creates an organization and a **headmaster**. Schools are added later at `/tenant/schools`. Platform admins manage tenants at `/platform/tenants`.

**Single** (`sms.tenancy.mode: single` on the API): Register and platform tenant screens are hidden. The seeded platform admin lands on `/tenant/schools` and manages schools for the default organization.

---

## Roles and home routes

| Role | After login |
| --- | --- |
| `SUPER_ADMIN` | `/platform/tenants` (multi) or `/tenant/schools` (single) |
| `HEADMASTER` | `/dashboard` |
| `ACADEMIC_MASTER` | `/dashboard` |
| `ACCOUNTANT` | `/finance` |
| `TEACHER` | `/teacher` |
| `STUDENT` | `/student` |
| `PARENT` | `/parent` |

---

## Requirements

- Node.js 20+
- Backend running on port **8989** (see the backend README)
- CORS already allows `http://localhost:5173`

---

## Local development

```bash
cd /home/lupo/projects/tz.co.chambaka/school_management_system_vue
npm install
npm run dev
```

Open http://localhost:5173

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite with API proxy |
| `npm run build` | Production bundle + PWA precache |
| `npm run preview` | Serve the `dist/` build |

### Accounts

Platform seed (backend first boot):

- Email: `halo.admin@halo-schools.net`
- Password: `ChangeMe123!`

New school / organization passwords must pass the Nexus policy (10+ chars, upper, lower, digit, special `!@#$%^&*`). Example: `HaloCampus1!`. `ChangeMe123!` is treated as common and cannot be used as a new password.

Forgot password: the API texts a 6-digit code to the phone on the account. In the backend `dev` profile the forgot response also includes `debugCode`.

White-label: add `?school=<slug>` or use a mapped custom domain. Branding store calls `GET /api/v1/public/branding/{slug}` or `?host=`.

---

## App map

| Path | Who |
| --- | --- |
| `/login`, `/register`, `/forgot` | Guests |
| `/platform/tenants`, `/platform/schools`, `/platform/audit` | Platform admin |
| `/tenant/schools`, `/campuses` | Headmaster |
| `/dashboard`, people, academics, finance, notices, branding, audit | School officers and staff |
| `/teacher`, `/student`, `/parent` | Role homes |
| `/security` | Change password (all signed-in roles) |

Auth tokens and the current user live in `localStorage` (`halo.user` plus access/refresh tokens).

---

## Project layout

```
src/
  api/          HTTP client and endpoint helpers
  components/   HaloCrest, Icon, PasswordStrengthInput, StudentPhoto
  layouts/      GuestShell, AppShell
  stores/       auth, branding
  views/        auth, admin, tenant, platform, teacher, student, parent
  assets/       ShuleHub theme (`styles.css`)
public/         PWA icons
docs/screens/   UI catalog images
```

---

## License

Proprietary — Chambaka. All rights reserved.
