# WAA PropFlow - Property Management Software

## Phase 1: Design System & Foundation
- [x] Global design tokens, color palette, typography (Inter + DM Serif Display)
- [x] index.css with premium CSS variables and animations
- [x] DashboardLayout customization with WAA PropFlow sidebar nav
- [x] App.tsx routing for all pages

## Phase 2: Database Schema & Migrations
- [x] properties table
- [x] units table
- [x] owners table
- [x] tenants table
- [x] leases table
- [x] rent_payments table
- [x] maintenance_requests table
- [x] expenses table
- [x] documents table
- [x] Run migration and apply SQL

## Phase 3: Backend Routers (v1)
- [x] properties, units, owners, tenants, leases routers
- [x] rentPayments, maintenanceRequests, expenses, documents routers
- [x] dashboard + accounting routers

## Phase 4-7 (v1): Admin pages, Tenant Portal, RBAC, Demo Data & Tests
- [x] All v1 pages, RBAC, seed data, 17 tests passing

## DoorLoop-Style Rework (v2)

### Navigation & Global UI
- [x] New sidebar: Overview, AI Assistant, Calendar, Rentals, Leasing, People, Tasks & Maintenance, Accounting, Communications, Files & Agreements, Reports, Workflows, Settings
- [x] Global search bar in top nav
- [x] "+ Create New" mega-menu with categorized quick actions
- [x] Grouped sidebar sections (Management, Finance, Operations)

### Database Schema (v2 tables)
- [x] vendors table
- [x] prospects table
- [x] tasks table (general tasks + tenant/owner requests)
- [x] work_orders table (one-time + recurring)
- [x] bank_accounts table
- [x] transactions table (charges, payments, expenses, deposits)
- [x] transaction_line_items table (multi-line charges: Rent, CAM, Property Taxes)
- [x] recurring_charges table (recurring rent + future increases)
- [x] owner_transactions table (contributions, distributions)
- [x] announcements table
- [x] calendar_events table
- [x] rental_applications table
- [x] inspections table
- [x] autopay_settings table

### Overview Dashboard (widgets)
- [x] Recent payments received widget
- [x] Leases with outstanding balances widget
- [x] Recent tenant requests widget
- [x] Occupancy rate donut chart
- [x] Vacancies by property bar chart
- [x] A/R & A/P aging widgets
- [x] Rental stats (properties, units, sqft)
- [x] Cash flow chart (combines v1 + v2 data)

### Rentals
- [x] Properties list + New property (with ?new=1 trigger)
- [x] Property profile with units, stats, occupancy
- [x] Units list + New unit
- [x] /rentals and /rentals/:id route aliases

### Leasing
- [x] Active leases list
- [x] Draft leases list
- [x] Applications tab
- [x] Prospects pipeline tab
- [x] Lease creation modal

### People
- [x] Tenants tab
- [x] Owners tab
- [x] Vendors tab
- [x] Create modals (tenant, owner, vendor)

### Tasks & Maintenance
- [x] All tasks list
- [x] Task detail with post update + complete
- [x] Work orders list
- [x] New work order modal (one-time + recurring)
- [x] Vendor assignment

### Accounting
- [x] Overview, Transactions, Outstanding tabs
- [x] Bank accounts with balances (Settings)
- [x] Record expense modal (line items, AI expense capture)
- [x] Post charge modal (single)
- [x] Bulk post charges by square footage (CAM allocation)
- [x] Receive payment modal
- [x] Recurring rent with CAM + property taxes
- [x] Income vs Expenses chart (combined data sources)

### Reports
- [x] Reports center with tabs
- [x] Profit & Loss statement (itemized income/expenses)
- [x] CAM reconciliation report
- [x] A/R aging detail
- [x] AI Insights on reports
- [x] Print / PDF action

### Communications & Files
- [x] Announcements
- [x] Files & agreements (document center, /files alias)

### Calendar & Workflows & Settings
- [x] Calendar month grid with events
- [x] Workflows (automation rules - simulated, toggles)
- [x] Settings page (Company, Bank Accounts, My Account)

### AI Features
- [x] AI Assistant chat page
- [x] AI Insights on P&L report
- [x] AI expense capture (invoice upload -> auto-fill)

### Tenant Portal v2
- [x] Make Payment multi-step wizard
- [x] Set up AutoPay
- [x] Account statement
- [x] Richer request form (general/maintenance type)
- [x] Payments ledger
- [x] My documents tab

### Final
- [x] Seed comprehensive demo data (vendors, transactions, CAM line items, etc.)
- [x] Tests for new routers (11 new v2 tests, 28 total passing)
- [x] Full QA + checkpoint

## Auth Rework & Tenant Invite Flow

- [x] Audit and remove Manus OAuth dependency from server and client
- [x] Add bcrypt password hashing dependency
- [x] Extend users table: passwordHash, inviteToken, inviteTokenExpiry, inviteUsed columns
- [x] Build auth.register procedure (email + password + name)
- [x] Build auth.login procedure (email + password → JWT session cookie)
- [x] Build auth.logout procedure (clear session cookie)
- [x] Build auth.me procedure (read session cookie → return user)
- [x] Build auth.createInvite procedure (admin creates invite for a tenant record)
- [x] Build auth.acceptInvite procedure (tenant sets password via invite token)
- [x] Build auth.validateInvite procedure (check token is valid/not expired)
- [x] Rewrite Login.tsx with email/password form
- [x] Create Register.tsx page for direct admin signup
- [x] Create AcceptInvite.tsx page for tenant invite acceptance
- [x] Update useAuth hook to redirect to /login instead of Manus OAuth
- [x] Update DashboardLayout and main.tsx to use new auth (redirect to /login)
- [x] Add "Invite to Portal" option in People/Tenants tenant card dropdown
- [x] Seed admin account (admin@waa-propflow.com / Admin1234!) via scripts/seed-admin.mjs
- [x] 28 tests still passing after auth rework
- [x] Full QA and checkpoint

## Resend Email Integration (Tenant Invites)

- [x] Install resend npm package
- [x] Add RESEND_API_KEY secret
- [x] Build server/email.ts helper with sendInviteEmail function
- [x] Update authRouter.createInvite to call sendInviteEmail after generating token
- [x] Branded HTML invite email template (WAA PropFlow styling)
- [x] Update People.tsx invite modal to show "Email sent!" confirmation
- [x] Graceful fallback: if email fails, still return invite link for manual sharing
- [x] 28 tests still passing after email integration
- [x] Checkpoint

## Follow-up: Sender Domain, Expiry Reminders & Portal Status Badges

### 1. Custom Sender Domain
- [x] Add RESEND_FROM_EMAIL env secret (optional; user skipped for now)
- [x] Make FROM_ADDRESS in server/email.ts read from ENV.resendFromEmail with fallback to onboarding@resend.dev
- [x] Add ENV.resendFromEmail to server/_core/env.ts

### 2. Invite Expiry Reminder (Heartbeat scheduled job)
- [x] Heartbeat SDK already bootstrapped in project
- [x] Add server/jobs/inviteExpiryReminder.ts — query invites expiring in 24h, send reminder email
- [x] Register POST /api/scheduled/invite-expiry-reminder in server/_core/index.ts
- [x] Add sendInviteReminderEmail + branded HTML template to server/email.ts
- [x] Note: schedule must be created via manus-heartbeat CLI after deploy (site must be live)

### 3. Portal Status Badges on Tenant Cards
- [x] Extend getTenants() in db.ts to left-join users and compute portalStatus
- [x] portalStatus: 'active' | 'invited' | 'expired' | 'none'
- [x] Render colored badge on each tenant card in People.tsx
- [x] 28 tests still passing; TypeScript clean

## Tenant Portal Dashboard Enrichment

- [x] Read current TenantPortal.tsx and existing portal tRPC procedures
- [x] Add portal.myDashboard procedure: lease + unit + property + nextDueDate + daysUntilExpiry
- [x] Build welcome card: greeting, tenant name, property name + address, unit number
- [x] Lease stats row: monthly rent, balance due, next due date, lease expiry with 60-day warning
- [x] QuickMaintenanceCard: collapsible inline form (title, category, priority, description) with success state
- [x] Maintenance tab badge shows open request count
- [x] TypeScript clean + 28 tests still passing
- [x] Checkpoint

## Maintenance Request Photo Upload

- [x] Add imageUrls column (JSON array of S3 URLs) to maintenanceRequests table in schema.ts
- [x] Run drizzle-kit generate and apply migration SQL
- [x] imageUrls stored as JSON string in DB, deserialized on read
- [x] Add POST /api/maintenance/upload endpoint (multer + S3 via storagePut)
- [x] Update maintenance.create tRPC procedure to accept imageUrls array
- [x] Build image upload UI in QuickMaintenanceCard: drag-and-drop + file picker, thumbnail previews, remove button
- [x] Upload each file to S3 immediately on selection, show spinner overlay per image
- [x] Validate: max 5 images, max 10MB each, image/* MIME types only
- [x] Submit button disabled while any image is still uploading
- [x] TypeScript clean + 28 tests still passing
- [x] Checkpoint

## Admin Maintenance Before/After Photo Upload

- [x] Add adminImageUrls column (JSON) to maintenance_requests table for manager-uploaded photos
- [x] Run drizzle-kit generate and apply migration SQL via webdev_execute_sql
- [x] Update maintenance.update tRPC procedure to accept adminImageUrls (merges with existing)
- [x] Rewrite Maintenance.tsx with PhotoUploadZone, PhotoStrip, Lightbox shared components
- [x] Edit modal shows Before/After photo upload zone when editing an existing request
- [x] Existing admin photos displayed as read-only strip before new upload zone
- [x] Request cards show tenant photos + manager photos in separate labeled strips
- [x] Submit button disabled while any photo is still uploading
- [x] TypeScript clean + 28 tests still passing
- [x] Checkpoint

## Multi-Tenancy

### Phase 1 — Schema
- [x] Add `organizations` table (id, name, slug, plan, trialEndsAt, createdAt, updatedAt)
- [x] Add `orgId` FK column to: users, owners, properties, tenants, vendors, bankAccounts, transactions (root-level tables; child tables inherit via FK)
- [x] Run drizzle-kit generate and applied migration SQL

### Phase 2 — Auth & Context
- [x] orgId available on ctx.user via DB lookup (authenticateRequest fetches full user row including orgId)
- [x] Add `orgProtectedProcedure` in trpc.ts that throws FORBIDDEN if orgId is null

### Phase 3 — DB Helpers & Routers
- [x] getOwners, getProperties, getTenants, getLeases, getDashboardMetrics all filter by orgId
- [x] createOwner, createProperty, createTenant stamp new records with orgId
- [x] owners.list, properties.list+create, tenants.list+create, leases.list, dashboard.metrics all pass ctx.user.orgId
- [x] inArray added to drizzle-orm imports for org-scoped dashboard metrics

### Phase 4 — Self-Service Signup
- [x] authRouter.register: creates org first (name + auto-slug), then admin user linked to orgId
- [x] Register.tsx: Company Name field added (optional, defaults to "[Name]'s Company")
- [x] Org slug: auto-generated from company name + nanoid(6) suffix for uniqueness

### Phase 5 — Data Migration & Hardening
- [x] Inserted 'WAA PropFlow Demo' org and linked all existing users/owners/properties/tenants/vendors/bankAccounts/transactions to it
- [x] 28 tests still passing; TypeScript clean
- [x] Checkpoint

## Forgot Password / Reset Password Flow

- [x] Reset admin password immediately via SQL (admin@waa-propflow.com / Admin1234!)
- [x] Add auth.forgotPassword procedure: generate 48-char nanoid token, 1h expiry, send reset email
- [x] Add auth.validateResetToken procedure: check token is valid/not expired
- [x] Add auth.resetPassword procedure: verify token, hash new password, clear token fields
- [x] Add resetToken + resetTokenExpiry columns to users table (migration applied)
- [x] Build ForgotPassword.tsx: email form + "Check your inbox" success state
- [x] Build ResetPassword.tsx: token validation, new password form, success state, expired/invalid states
- [x] Add "Forgot password?" link next to Password label in Login.tsx
- [x] Register /forgot-password and /reset-password routes in App.tsx (public, unauthenticated)
- [x] Branded HTML reset email template (matches invite email style)
- [x] Email enumeration protection: forgotPassword always returns success regardless of email existence
- [x] TypeScript clean + 28 tests still passing
- [x] Checkpoint

## Production Readiness (Round 2)

- [x] APP_BASE_URL secret: added to env.ts + wired into invite and reset email URL construction
- [x] Rate-limit forgot-password: per-IP max 3/15min + per-email max 3/15min, in-memory store with auto-cleanup
- [x] Trial countdown banner: dismissible amber/red banner in DashboardLayout above main, shows when plan=trial and <=7 days left
- [x] Org Settings page: company name, logo upload (S3), timezone selector, plan badge + trial countdown in Settings → Organization tab
- [x] org.getSettings and org.updateSettings tRPC procedures added to routers.ts
- [x] Logo upload reuses existing /api/maintenance/upload endpoint
- [x] 28 tests still passing; TypeScript clean
- [x] Checkpoint

## Team Members (Org Settings)

- [x] Add team.list procedure: return all users in same org (id, name, email, role, createdAt, status)
- [x] Add team.invite procedure: create staff user with 7-day invite token + send branded email via Resend
- [x] Add team.updateRole procedure: admin can change a member's role (admin/manager)
- [x] Add team.remove procedure: admin can remove a member from the org (cannot remove self; nullifies orgId)
- [x] Add manager to users role enum (migration applied)
- [x] Add sendStaffInviteEmail function to email.ts with branded HTML template
- [x] Build TeamMembersCard in Settings.tsx: member list with avatar, name, email, status badge, role dropdown, remove button
- [x] Inline invite form: name + email + role selector, sends invite email, shows copy-link fallback
- [x] Role change dropdown per member row (admins only; own row shows read-only badge)
- [x] Remove member with confirm dialog; cannot remove self
- [x] Guard: team procedures use adminProcedure (admin role only)
- [x] 28 tests still passing; TypeScript clean
- [x] Checkpoint

## Browser Warning & Document Management Audit

- [x] Audit app pages and shared components for potential ResizeObserver and layout-loop warning sources
- [x] Verify document upload input validation and backend upload/storage handling
- [x] Test document listing, search, category filtering, download, and delete operations
- [x] Fix verified document workflow or browser-warning issues
- [x] Add targeted document validation coverage and prepare the verification checkpoint
- [x] Save a verification checkpoint covering document hardening, migration, and tested workflow

## Document Previews & Delete Safety

- [x] Add image thumbnails and PDF preview tiles to document cards
- [x] Add a document deletion confirmation dialog with filename context
- [x] Add targeted test coverage and verify preview and guarded deletion behavior
- [x] Save a checkpoint for the document preview and delete-safety update

## Advanced Document Management

- [x] Add document filtering by property and tenant
- [x] Add queued multi-file uploads with per-file progress, error state, and retry controls
- [x] Add expiring shareable document links with access validation
- [x] Add targeted automated tests and verify the new document-management flows
- [x] Replace staged upload values with real per-file transfer progress reporting
- [x] Add route-level coverage for the single-file upload endpoint and public share-link access, plus manual multi-file queue and retry verification
- [x] Run a consented end-to-end test of temporary multi-file upload, retry, share link, expiry, and cleanup
- [x] Save a checkpoint for the advanced document-management update
- [x] Add integration coverage for document upload validation and share-link creation, revocation, and public access

## Vendors Management Module

- [x] Review People patterns and the existing vendors data model for reuse
- [x] Extend vendor records with company address, specialties, primary contact, and telephone number
- [x] Add secure vendor list, create, update, and delete procedures
- [x] Add Vendors to the Management navigation and register the route
- [x] Build a People-style Vendors page with search, create, edit, and guarded delete actions
- [x] Add automated coverage and validate the Vendors workflow in the browser
- [x] Save a checkpoint for the Vendors module
- [x] Add automated vendor update and delete procedure coverage
- [x] Verify search and a complete temporary vendor create, edit, guarded delete, and cleanup flow in the browser

## Vendor Compliance & Work Order Workflow

- [x] Confirm email and in-app expiry alerts for organization admins as the reminder policy
- [x] Add vendor certificate, expiry, preferred-provider, service-area, and performance-note data structures
- [x] Link vendor assignments directly to work-order creation and updates
- [x] Add secure certificate upload, retrieval, and expiry reminder handling
- [x] Build vendor profile controls for compliance, service coverage, and performance notes
- [x] Add automated coverage and end-to-end validation for assignment, certificate, and reminder workflows
- [x] Save a checkpoint for the vendor workflow expansion
- [x] Add confirmation-protected performance-note removal for complete vendor record lifecycle management
- [x] Create and verify the active daily project-level Heartbeat schedule for vendor insurance email reminders at 14:00 UTC

## Sidebar Color Update

- [x] Change the dashboard sidebar from navy blue to dark gray while preserving accessible navigation contrast
- [x] Verify sidebar states in the browser and publish the theme update

## Dashboard Theme Exploration

- [x] Generate six distinct PropFlow dashboard theme mockups for user selection
- [x] Deliver the six visual options with concise theme labels

## Forest + Slate Theme

- [x] Apply the selected dark forest sidebar, green actions, soft neutral canvas, and muted green chart accents
- [x] Verify visual contrast and consistency across desktop and mobile dashboard views
- [x] Save a checkpoint for the Forest + Slate theme update

## Organization Theme Preferences

- [x] Define approved organization theme palettes and their accessible dashboard token mappings
- [x] Persist the selected palette in organization settings with organization-scoped validation
- [x] Add a Settings selector with palette previews and immediate runtime application
- [x] Test persistence, organization isolation, and visual contrast for selected palettes
- [x] Save a checkpoint for organization theme preferences

## Dark Mode & Palette Previews

- [x] Add a user-level dark mode preference that adapts the active organization palette for nighttime viewing
- [x] Define accessible dark palette token variants for all six approved organization palettes
- [x] Replace palette swatches with visual dashboard preview thumbnails in Organization Settings
- [x] Test persistence, contrast, and responsive settings behavior for dark mode and palette previews
- [x] Save a checkpoint for dark mode and preview enhancements

## Independent Migration Audit & Handoff

- [x] Preserve the current application and create a non-destructive migration inventory
- [x] Document architecture, source layout, runtime, services, configuration, schedules, domains, and Manus dependencies
- [x] Produce sanitized database, storage, authentication, integration, and self-hosting documentation
- [x] Prepare verified sanitized source-code and handoff ZIP archives with manifests and a final verification matrix
- [x] Inspect GitHub export availability; GitHub connector is not enabled and direct raw authentication was not attempted
- [x] Collect the user’s confirmed private repository target: JoshuaCherryAI/propflow-migration
- [x] Create and verify the private sanitized export at https://github.com/JoshuaCherryAI/propflow-migration (commit c66d6cfa0aeedfa1c4979548d5a25c220f066187)
