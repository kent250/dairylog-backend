# DairyLog API

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/kent250/dairylog-backend/blob/main/LICENSE)
[![GitHub Actions CI](https://github.com/kent250/dairylog-backend/actions/workflows/ci.yaml/badge.svg)](https://github.com/kent250/dairylog-backend/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

## 📖 Overview

DairyLog API is a robust backend solution designed for dairy co-operatives to automate and digitize their milk collection process. This project was developed to solve the real-world challenge of manual, error-prone record-keeping at local milk collection centers.

The system allows co-op staff (Managers) to register farmers and log daily milk deliveries. It provides immediate transparency to farmers by automatically sending an SMS notification upon registration and another SMS with quantity and price details after each milk record is submitted.

While the functional scope is focused, the primary goal of this project was to build a **production-ready, scalable, and maintainable API** by implementing best-in-class coding practices.

---

## ✨ Key Features

* **100% TypeScript:** Strongly typed codebase for maintainability and developer-friendliness.
* **Containerized:** Full `Dockerfile` and `compose.yaml` for consistent development and production environments.
* **CI/CD Pipeline:** Automated testing pipeline with GitHub Actions.
* **Database Migrations:** SQL-based migrations powered by Drizzle ORM.
* **Comprehensive Testing:** Unit tests using Jest.
* **API Documentation:** Auto-generated Swagger (OpenAPI) documentation.
* **Scalable Architecture:** Modular, service-oriented file structure.
* **Authentication:** Secure JWT-based authentication (access and refresh tokens).
* **Validation:** Schema-based request validation using Zod.
* **Real-time Notifications:** Integrated with httpSMS for sending SMS alerts to farmers.

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Drizzle ORM |
| **Testing** | Jest |
| **Auth** | JSON Web Tokens (JWT) |
| **Validation** | Zod |
| **Containerization** | Docker, Docker Compose |
| **CI/CD** | GitHub Actions |
| **API Docs** | Swagger / OpenAPI |
| **Linting** | ESLint |
| **SMS Gateway** | httpSMS |

---

## 🚀 Getting Started

You can run this project either locally or using Docker.

### Prerequisites

* **Node.js:** `v20.x` or higher
* **PostgreSQL:** A running local instance (not managed by the `compose.yaml`)
* **Docker & Docker Compose:** Required for the containerized setup
* **httpSMS App:** The [httpSMS Android App](https://httpsms.com/) installed on your phone and an active account.

---

### 1. Local Development Setup

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/kent250/dairylog-backend.git](https://github.com/kent250/dairylog-backend.git)
    cd dairylog-backend
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    * Create a `.env.development` file from the example:
        ```sh
        cp .env.example .env.development
        ```
    * Edit `.env.development` with your credentials for:
        * `DATABASE_URL` (your local PostgreSQL instance)
        * `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
        * `HTTP_SMS_API_KEY` and `HTTP_SMS_FROM_NUMBER`

4.  **Run database migrations:**
    ```sh
    npm run db:migrate
    ```

5.  **Start the development server:**
    ```sh
    npm run dev
    ```
    The server will be running on `http://localhost:3000`.

---

### 2. Docker Setup

This is the recommended way to run the application in a consistent environment.

1.  Follow steps 1 and 3 from the local setup to **clone the repo** and **create the `.env.development` file**.

2.  Build and run the container:
    ```sh
    docker compose up
    ```
    (Add `-d` to run in detached mode).

3.  The API will be available at `http://localhost:3000`.

---

## 🧪 Running Tests

This project uses Jest for unit testing. To run the complete test suite:

```sh
npm run test