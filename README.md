# **PigMint Finance - Group 5**

### Team Members - Arsuhi Jha & Nikitha Konanki Rajeswara Rao

### *Smart Micro-Savings, Spending Insights & Financial Recommendations*

*A Cloud-Native Distributed System Built on Google Cloud Platform*

---

## **Overview**

PigMint Finance is a modern financial automation system that analyzes user transactions, applies micro-saving rules (such as round-ups), tracks progress toward savings goals, and generates smart, deterministic recommendations based on spending patterns.

This project includes:

* A **custom-built frontend** (React + TypeScript + Vite)
* A **distributed backend** composed of **three microservices**
* Google Cloud infrastructure using:

  * **Cloud Run**
  * **Pub/Sub**
  * **Cloud SQL (PostgreSQL, private IP)**
  * **Redis Memorystore (private IP)**
  * **Serverless VPC Connector**
  * **Artifact Registry**

PigMint is fully containerized, scalable, and wired for private communication between services inside GCP.

---

## **System Architecture**

```
   ┌────────────────────────┐       ┌──────────────────────────────────┐
   │      Frontend          │ HTTPS │        API Gateway (Flask)      │
   │  (React + TypeScript)  │──────▶│ Publishes events to Pub/Sub     │
   │  Custom-built UI        │       │ Reads/Writes Cloud SQL, Redis   │
   └────────────────────────┘       └──────────────────────────────────┘
                                         │
                                         ▼
                         ┌───────────────────────────────────┐
                         │      Pub/Sub Topic                │
                         │       transactions.raw            │
                         └───────────────────────────────────┘
                                         │ (push)
                                         ▼
                   ┌────────────────────────────────────────────┐
                   │        Event Processor (Flask)              │
                   │ Stores transactions                         │
                   │ Applies saving rules (round-up, etc.)       │
                   │ Updates savings ledger + goals              │
                   │ Generates recommendations                   │
                   └────────────────────────────────────────────┘
                                         │
                                         ▼
                         ┌────────────────────────────────┐
                         │   Cloud SQL (PostgreSQL)       │
                         │   Private IP + VPC Connector   │
                         └────────────────────────────────┘
                                         │
                                         ▼
                   ┌──────────────────────────────────────────┐
                   │    Analytics Service (Flask)             │
                   │ Returns category spending breakdown      │
                   │ For charts and insights in UI            │
                   └──────────────────────────────────────────┘
```

---

## **Microservices**

PigMint has **three backend microservices**, each deployed to **Cloud Run** with private networking:

### **1. API Gateway (public entrypoint)**

**URL:** `https://pigmint-api-gateway-ugzdkpfc7q-uc.a.run.app`
Handles:

* User profile API
* Transaction simulator input
* Recent transactions feed
* Rules CRUD
* Goals CRUD
* Dashboard overview
* Recommendations
* Proxy requests to Analytics Service
* Publishes messages to Pub/Sub

### **2. Event Processor (private service via Pub/Sub push)**

**URL:**
`https://pigmint-event-processor-ugzdkpfc7q-uc.a.run.app`

Receives events through Pub/Sub Push → `/internal/pubsub/transactions`
Responsibilities:

* Insert transactions
* Apply rules (round-up or others)
* Insert savings ledger entries
* Update user savings totals
* Update goals progress
* Generate deterministic recommendations

### **3. Analytics Service (private)**

**URL:**
`https://pigmint-analytics-service-ugzdkpfc7q-uc.a.run.app`

Provides:

* Spending by category (week/month/all-time)
* Used for UI dashboards & charts

---

## **Pub/Sub Messaging**

### **Topic**

```
transactions.raw
```

### **Subscription**

```
transactions.raw-sub  (push subscription)
```

### **Push Endpoint**

```
https://pigmint-event-processor-ugzdkpfc7q-uc.a.run.app/internal/pubsub/transactions
```

---

## **Database (Cloud SQL - PostgreSQL)**

**Instance:** `pigmint-db`
**Private IP:** `10.102.0.3`
**Database:** `pigmint_data`
**User:** `postgres`

### **Tables**

* `users`
* `transactions`
* `savings_ledger`
* `goals`
* `goal_progress`
* `rules`
* `recommendations`

Stores all financial history, rule states, goals, and aggregated savings.

---

## **Redis Memorystore**

**Instance:** `pigmint-redis-cache`
**Private IP:** `10.0.148.19`

Used for:

* Rules caching (`rules:<user_id>`)
* Future expansion into caching analytics or rate limiting

---

## **VPC Connector**

All private services use:

```
pigmint-connector
```

Configured with:

```
--vpc-egress=private-ranges-only
```

This allows Cloud Run → Cloud SQL → Redis communication purely over **internal private IP**.

---

## **Frontend Application**

You have built a custom frontend using:

* **React**
* **TypeScript**
* **Vite**
* **Your own UI components**
* **Custom state management**
* **Authentication**
* **Goals UI**
* **Rules UI**
* **Dashboard**
* **Recommendations UI**
* **Transaction views + forms**

The UI now pulls **all data from the GCP backend**, no longer from local client state or direct database access.

### **Frontend Env Variable**

```
VITE_PIGMINT_API_BASE_URL=https://pigmint-api-gateway-ugzdkpfc7q-uc.a.run.app
```

---

## **Recommendation Logic**

Currently the Event Processor generates **4 deterministic recommendations**:

1. Dining spending > 30%
2. Dining > 30% AND Groceries < 10%
3. Other category > 40%
4. More than 20 transactions AND average < $10

These appear in:

```
GET /api/recommendations/latest
```

and on:

```
GET /api/dashboard/overview
```

---

## **Local Development**

You can run each service locally via Docker:

```
docker build -t api-gateway ./api-gateway
docker run -p 8080:8080 api-gateway
```

or use:

```
python main.py
```

if not using Gunicorn.

---

## Deployment Structure

You deploy using a script such as:

```
pigmint-up.ps1
```

This script:

* Builds Docker images
* Pushes to Artifact Registry
* Deploys all 3 services
* Ensures VPC connector is enabled
* Sets environment variables
* Configures Pub/Sub subscription

You can tear down with:

```
pigmint-down.ps1
```

---

## Future Enhancements

* Additional savings rules
* ML-based recommendations
* Weekly/monthly insights
* Budget planning tools
* Multi-user authentication
* User-defined custom analytics
