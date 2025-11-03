# AnnotatePro Architecture Scaffold

This repository skeleton was generated from the product PRD and captures the major domains, data flows, and runtime responsibilities of the AnnotatePro platform.

## Getting Started

### Prerequisites

- Node.js 18 or higher

### Install & Run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Visit `http://localhost:3000` to access the placeholder UI.

## Highlights

- **Next.js App Router** structure under `app/`, organized by user journeys such as authentication, dashboard, project operations, annotation, review, dataset management, analytics, and administration.
- **Feature-first modules** in `features/` that encapsulate hooks, services, and UI composition for each product capability.
- **Shared libraries** in `libs/` for networking (tRPC), realtime (Socket.io), validation (Zod), utilities, and localization.
- **Back-end services** under `server/`, separating authentication, authorization, domain services, repositories, workers, AI integrations, storage adapters, analytics, and observability.
- **Cross-cutting packages** such as shared contracts and the public JS SDK in `packages/`.
- **Prisma data layer** prepared in `prisma/schema.prisma`, plus `scripts/` and `tests/` directories to host automation and quality suites.

## Next Steps

1. Flesh out the Prisma schema based on the documented entities (users, organizations, projects, datasets, tasks, annotations, reviews, workflows, integrations, and logs).
2. Implement NextAuth configuration and RBAC policies inside `server/auth` and `server/permissions`.
3. Wire tRPC routers and React Query providers to back the feature modules.
4. Prototype the annotation canvas, realtime presence, and review workflows for the MVP modalities (image/text).
