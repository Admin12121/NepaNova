# E-Commerce Platform

This project is a high-performance, full-stack e-commerce application architected using Next.js 16 for the frontend and Django for the backend. It adheres to modern microservices principles, enforcing a strict separation of concerns between the client interface and server logic to ensure scalability, maintainability, and security.

## Project Architecture

The application utilizes a decoupled architecture:

*   **Client-Side:** Built with Next.js 16, leveraging Server-Side Rendering (SSR) and Static Site Generation (SSG) for optimal SEO and performance. State management is handled via Redux Toolkit and RTK Query for efficient data fetching and caching.
*   **Server-Side:** Powered by Django and Django REST Framework (DRF), providing a secure and scalable API accessed by the client.
*   **Communication:** The frontend communicates with the backend via RESTful HTTP endpoints. Data serialization and validation are strictly enforced on both ends.

## core Functionalities

### 1. Secure Payment Gateway Integration
The system implements a robust payment processing layer supporting multiple transaction methods:
*   **Digital Wallet (Esewa):** Full integration with the Esewa payment gateway, including secure hash generation, signature verification, and transaction validation via server-side callbacks.
*   **Cash on Delivery (COD):** A managed workflow for deferred payments, including order verification and post-delivery status updates.

### 2. Comprehensive Administrative Dashboard
A centralized command center allows administrators to oversee operations with granular control:
*   **Data Analytics:** Aggregation of sales data, revenue metrics, and user acquisition rates visualized through chart libraries.
*   **Order Lifecycle Management:** End-to-end tracking of orders from initiation to delivery, with status transitions and audit logs.
*   **Inventory Control:** Real-time stock monitoring with low-inventory alerts preventing overselling.

### 3. Customer Relationship Management (CRM)
Integrated CRM tools facilitate user retention and management:
*   **Identity Management:** Secure authentication system using JWT (JSON Web Tokens) for stateless, scalable session management.
*   **User Profiling:** comprehensive user accounts tracking order history, saved addresses, and preferences.

### 4. Dynamic Storefront Customization
The platform offers a high degree of UI/UX flexibility:
*   **Component-Driven Design:** Utilizes a modular component architecture allowing for rapid UI updates without code refactoring.
*   **Content Management:** Administrators can dynamically update banner images, promotional sections, and layout configurations directly from the backend.

## Technical Specifications

### Frontend
*   **Framework:** Next.js 16 (React)
*   **Language:** TypeScript (Strict Mode)
*   **Styling:** Tailwind CSS with Shadcn/UI components
*   **State Management:** Redux Toolkit & RTK Query
*   **Form Validation:** Zod
*   **Runtime:** Bun

### Backend
*   **Framework:** Django 5.x
*   **API Framework:** Django REST Framework
*   **Database:** PostgreSQL (Production grade recommended), SQLite (Development)
*   **Environment Management:** uv (Python package and project manager)
*   **Authentication:** JWT (JSON Web Tokens)

## Installation and Configuration

### Prerequisites
*   **Node.js Environment:** Bun (v1.x or higher)
*   **Python Environment:** Python 3.10+ and uv

### Backend Setup

1.  **Navigate to the server directory:**
    ```bash
    cd server
    ```

2.  **Initialize Environment:**
    Install dependencies using `uv` for deterministic builds.
    ```bash
    uv sync
    ```

3.  **Database Migration:**
    Propagate data models into the database schema.
    ```bash
    uv run manage.py migrate
    ```

4.  **Execute Server:**
    Start the WSGI application server.
    ```bash
    uv run manage.py runserver
    ```
    The API service will be exposed at HTTP port 8000.

### Frontend Setup

1.  **Navigate to the client directory:**
    ```bash
    cd client
    ```

2.  **Install Dependencies:**
    Resolve and install JavaScript packages via Bun.
    ```bash
    bun install
    ```

3.  **Execute Development Server:**
    Start the Next.js development server with hot-module replacement.
    ```bash
    bun run dev
    ```
    The application interface will be accessible at HTTP port 3000.

## Environment Configuration

Security critical configurations are managed via environment variables.

1.  **Client Configuration:**
    Duplicate `client/.env.example` to `client/.env`. Configure the API endpoints and authentication secrets.
    *   `NEXT_PUBLIC_BACKEND_URL`: The reachable URL of the Django API.
    *   `NEXTAUTH_URL`: The canonical URL of the client application.

2.  **Server Configuration:**
    Duplicate `server/.env.example` to `server/.env`. Configure database connections and secret keys.

## Deployment Considerations

For production environments, it is recommended to:
*   Use a production-grade WSGI/ASGI server like Gunicorn or Uvicorn.
*   Serve static files via Nginx or a cloud storage provider (AWS S3).
*   Set `DEBUG=False` in the Django settings.
*   Configure SSL/TLS for secure communication (HTTPS).
