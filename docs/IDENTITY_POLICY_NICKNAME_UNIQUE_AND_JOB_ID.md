# Identity Policy: Unique Nickname and Job ID

Effective date: 2026-02-15
Scope: `backend`, `gallery-app`, analytics, admin operations

## 1. Policy Decision

1. Nickname is a user-facing identifier and must be unique.
2. Every account must keep a unique nickname at create/update time.
3. All job lifecycle operations must use `jobId` as the primary key.
4. All user authorization and ownership checks must use immutable `userId`.

## 2. Identifier Rules

| Domain | Display | Unique Key | Must be used for auth/action |
|---|---|---|---|
| User | `nickname` | `userId`, `nickname` | `userId` |
| Job | `title` | `jobId` | `jobId` + `userId` ownership check |
| Analytics user slice | `nickname` (optional) | `userId` | `userId` |

## 3. API and Backend Rules

1. Never fetch or mutate a job by nickname.
2. URL path for job operations must be `.../jobs/{jobId}`.
3. Ownership checks must compare `job.userId` with authenticated `user.id`.
4. `check-nickname` validates format and uniqueness.
5. Any endpoint returning multiple users for same nickname must include `userId`.

## 4. UI and Admin Rules

1. UI may show nickname, but action payload must send `jobId` (and server resolves user by auth).
2. Admin tables should expose `jobId` for disambiguation when nicknames collide.
3. Search by nickname is allowed as a convenience filter only; never as target identity.

## 5. Analytics Rules

1. Segmenting a specific user must use GA user property `customUser:userId`.
2. Nickname is allowed for display, but user-level aggregation should prefer `userId`.
3. If nickname is shown in reports, pair it with `userId` in admin/debug views.

## 6. Implementation Checklist

1. `check-nickname` returns `available=false` when nickname already exists.
2. Profile update API rejects nickname already used by another account.
3. OAuth/mobile new-user creation resolves collisions before save.
4. Client events and ranking writes send `userId`, not nickname.
5. Admin and user job actions call APIs by `jobId`.

## 7. Anti-Patterns (Do Not)

1. Do not bypass uniqueness checks on nickname writes.
2. Do not use nickname for permission checks.
3. Do not use nickname to identify a single job.
4. Do not build URLs with nickname for mutable resources.

## 8. Migration Notes

1. Startup migration (`MongoIndexInitializer`) normalizes legacy nicknames before index creation.
2. Duplicate/blank nicknames are rewritten with deterministic suffix strategy (`base`, `base_1`, `base_2`, ...).
3. DB unique index name is `ux_nickname` on field `nickname`.
4. Existing integrations should use `userId` for identity and `nickname` for display.
5. Analytics dashboards should be grouped by `userId` first.
