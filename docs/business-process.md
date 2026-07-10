# Business Process Diagrams — InvenTrack (Existing)

This document describes the business processes **already implemented** in InvenTrack (not a proposal/future plan), based on `PRD.md`, `prisma/schema.prisma`, and the Server Actions implementation in `src/actions/`.

Actors:
- **Admin** — full access (asset CRUD, master data, users, labels, import/export, mutations, audit log, settings).
- **Viewer** — read-only (dashboard, view asset list/detail).
- **Public** — scan QR, no login, only sees the verification page.

Note: the system has **no multi-stage approval workflow** (no pending/approved status). Data change control relies on soft-delete + restore and per-field audit logging.

---

## 1. Actor & Module Map

```mermaid
flowchart LR
    Admin([Admin])
    Viewer([Viewer])
    Public([Public])

    subgraph Dashboard["Dashboard (auth-protected /dashboard/*)"]
        M1[Asset Management<br/>CRUD + AI extract]
        M2[Master Data<br/>category/location/fund source/condition]
        M3[Print QR Labels]
        M4[Web QR Scanner]
        M5[Asset Mutation - custody transfer]
        M6[Excel Import / Export]
        M7[User Management]
        M8[Audit Log]
        M9[Dashboard Statistics]
        M10[Institution Settings]
    end

    subgraph Public["Public (no auth)"]
        P1["/verify/[token] - Asset Detail"]
    end

    Admin --> M1 & M2 & M3 & M4 & M5 & M6 & M7 & M8 & M9 & M10
    Viewer --> M9
    Viewer -.read only.-> M1
    Public --> P1
```

---

## 2. Main End-to-End Flow

```mermaid
flowchart TD
    Start([Start]) --> Login["Login with username + password"]
    Login --> Auth{Valid credentials?}
    Auth -- No --> Login
    Auth -- Yes --> Role{Role?}
    Role -- VIEWER --> Dash["Dashboard statistics - read only"]
    Role -- ADMIN --> Home["Admin Dashboard"]

    Home --> Master["Manage Master Data<br/>category/location/fund source/condition"]
    Home --> AddMode{Add asset?}
    AddMode -- Manual --> Form["Fill asset form"]
    AddMode -- AI Extract --> Upload["Upload photo/PDF"]
    Upload --> Gemini["Gemini API extracts fields to JSON"]
    Gemini --> Review["Review & correct fields"]
    Review --> Form
    Form --> GenCode["Auto-generate asset_code<br/>PREFIX-YEAR-SEQ + qr_token"]
    GenCode --> Save[("Save asset + audit log CREATE")]

    Save --> QR["View / download QR Code"]
    Save --> Label["Print label PDF - single/bulk"]
    QR --> Print["Attach label to physical item"]
    Label --> Print
    Print --> Scan([Public scans QR])
    Scan --> Verify["/verify/token"]
```

---

## 3. Asset Lifecycle (Create → Edit → Mutation → Delete → Restore)

```mermaid
stateDiagram-v2
    [*] --> Active: Create (manual/AI) - auto asset_code & qr_token, audit log CREATE
    Active --> Active: Edit field (audit log UPDATE, old to new value)
    Active --> Active: Custody mutation (from_user to to_user, audit log)
    Active --> Deleted: Soft delete (set deleted_at, audit log DELETE)
    Deleted --> Active: Restore (clear deleted_at, audit log RESTORE)
    Deleted --> [*]
    note right of Deleted
        Scanning QR of deleted asset
        -> "Asset Not Found"
    end note
```

---

## 4. Public Verification Flow (QR Scan)

```mermaid
flowchart TD
    A([Public scans QR on item]) --> B["Open /verify/token"]
    B --> C{Token matches qr_token<br/>& asset not deleted_at?}
    C -- No --> D["'Asset Not Found' page"]
    C -- Yes --> E["Query asset + photos + category/location/condition/fund source"]
    E --> F["Log scan_logs<br/>timestamp, IP, user agent"]
    F --> G["Render 'Asset Verified'<br/>photos, asset code, item code, NUP, condition, etc. (SSR)"]
```

---

## 5. Excel Import / Export Flow

```mermaid
flowchart TD
    subgraph Export
        E1["Admin opens /dashboard/assets/export"] --> E2["Set optional filters<br/>category/condition/year"]
        E2 --> E3["Generate .xlsx workbook<br/>+ compute book value = acquisition - depreciation"]
        E3 --> E4["Download file"]
    end

    subgraph Import
        I1["Admin downloads template"] --> I2["Fill data in Excel"]
        I2 --> I3["Upload file"]
        I3 --> I4["Map headers + validate<br/>required fields, master data match, unique serial number"]
        I4 --> I5{All rows valid?}
        I5 -- Some failed --> I6["Success/failure report per row<br/>max 50 errors shown"]
        I5 -- Rows valid --> I7["Auto-generate asset_code & qr_token per row"]
        I7 --> I8[("Save new assets")]
    end
```

---

## Data Control Summary

- **No tiered approval** — every admin action takes effect immediately.
- **Audit trail** (`audit_logs`): every CREATE/UPDATE/DELETE/RESTORE on assets & mutations is logged with actor + old→new field diff.
- **Soft delete** (`deleted_at`) on `assets` and `users` — data is never permanently lost, can be restored via Trash.
- **Scan tracking** (`scan_logs`) — every public QR scan is logged (not an approval, observability only).
