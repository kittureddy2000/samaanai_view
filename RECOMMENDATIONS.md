# Recommendations for Cloud Run Deployment & Tech Stack

This document outlines key recommendations for deploying **Samaanai** to Google Cloud Run and optimizing the technology stack. It incorporates an analysis of the current codebase and industry best practices for serverless Python/Node applications.

## 1. Top Priority (P1) - Critical Security & Architecture

### **A. Migrate Frontend Build System**
*   **Recommendation**: Migrate from Create React App (CRA) to **Vite**.
*   **Why**: CRA is deprecated and unmaintained. Vite offers significantly faster build times (10-100x), better hot module replacement (HMR) for development, and a smaller production bundle.
*   **Effort**: Medium. Requires moving `index.html`, updating direct environment variable references (from `REACT_APP_` to `VITE_`), and changing the build command.

### **B. Database Connection Pooling**
*   **Recommendation**: Implement **PgBouncer** or use Google Cloud SQL Auth Proxy with connection pooling enabled.
*   **Why**: Cloud Run instances scale down to zero. When they scale up, every new container opens a new connection to Postgres. Without pooling, a traffic spike can exhaust the database connection limit, causing `FATAL: remaining connection slots are reserved for non-replication superuser roles`.
*   **Implementation**: Use the Django `django-db-geventpool` (if async) or standard pooling options if upgrading to Django 5.x. Alternatively, run the Cloud SQL Auth Proxy sidecar with `-max-connections`.

### **C. Health Check Endpoints**
*   **Recommendation**: Add a dedicated `/health` endpoint in Django.
*   **Why**: Cloud Run needs to know when your container is ready to accept traffic (`startupProbe`) and when it is healthy (`livenessProbe`). Using a heavy endpoint (like `/`) for this checks can cause false positives during load.
*   **Implementation**: A simple view returning `200 OK` and checking DB connectivity.

### **D. Redis Caching & Async Infrastructure**
*   **Recommendation**: Provision a **Cloud Memorystore (Redis)** instance.
*   **Why**: 
    1.  **Caching**: Reduces database load for frequent queries (e.g., user profile, dashboard stats). Essential for mitigating "Cold Start" user experience.
    2.  **Celery/Task Queue**: If you need to offload long-running tasks (like syncing 2 years of bank transactions via Plaid), you *cannot* do this reliably during a web request in Cloud Run (60 min max timeout, but bad UX). Redis serves as the broker for Celery or Google Cloud Tasks.

## 2. High Priority (P2) - Performance & Optimization

### **A. Serve Static Files via CDN**
*   **Recommendation**: Use **Firebase Hosting** or **Google Cloud CDN** for frontend assets.
*   **Why**: Serving static files from a python container is inefficient. A CDN caches content at the edge, reducing latency for users globally and lowering Cloud Run costs.

### **B. Code Splitting**
*   **Recommendation**: Use `React.lazy` and `Suspense` for route-based code splitting.
*   **Why**: Reduces the initial JavaScript bundle size. Users only download code for the page they are viewing (e.g., "Nutrition" code isn't loaded when looking at "Finance").

### **C. CPU Boost**
*   **Recommendation**: Enable **CPU Boost** in Cloud Run.
*   **Why**: Provides more CPU power during container startup, significantly reducing cold start times for Django applications which have substantial initialization overhead.

## 3. Medium Priority (P3) - Future Proofing

### **A. Upgrade to Django 5.x**
*   **Recommendation**: Upgrade from Django 4.x to 5.x.
*   **Why**: Better support for asynchronous views and ORM queries (`await User.objects.aget()`), which pairs well with serverless environments to handle high concurrency with fewer containers.

### **B. Consider Next.js**
*   **Recommendation**: If SEO or Server Side Rendering (SSR) becomes a requirement, migrate to Next.js.
*   **Why**: Better performance for public-facing pages. However, since Samaanai is a dashboard (behind login), Vite + Client Side Rendering is perfectly acceptable and simpler to maintain.

## 4. Deployment Checklist Summary

- [ ] **[Backend]** Create `/health` endpoint.
- [ ] **[Backend]** Configure `django-storages` + `whitenoise` or GCS for static files.
- [ ] **[Backend]** Set up Secrets in Secret Manager.
- [ ] **[Database]** Enable Cloud SQL Auth Proxy sidecar or VPC Connector.
- [ ] **[Frontend]** Migrate `npm run build` to use **Vite**.
- [ ] **[Frontend]** Deploy frontend static files to separate static host (recommended) or Nginx container.
