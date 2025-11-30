# PigMint Finance Backend API

Express.js backend API for PigMint Finance application with JWT authentication, PostgreSQL database, and Google Cloud Pub/Sub integration.

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase)
- Google Cloud Project with Pub/Sub enabled (optional)

### Installation

```bash
cd backend
npm install
```

### Configuration

Create a `.env` file:

```env
PORT=3001
NODE_ENV=development

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Google Cloud Pub/Sub (optional)
GOOGLE_CLOUD_PROJECT=your-project-id
PUBSUB_TOPIC_TRANSACTIONS=pigmint-transactions
```

### Running

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

### Authentication

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "monthly_income": 5000
}

Response: 201
{
  "token": "jwt-token",
  "user": { "id", "name", "email", "monthly_income", "created_at" }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}

Response: 200
{
  "token": "jwt-token",
  "user": { "id", "name", "email", "monthly_income", "created_at" }
}
```

### Users

#### Get Profile
```http
GET /users/{userId}
Authorization: Bearer {token}

Response: 200
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "monthly_income": 5000,
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### Update Profile
```http
PATCH /users/{userId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "monthly_income": 6000
}

Response: 200
{ "id", "name", "email", "monthly_income", "created_at" }
```

### Transactions

#### Create Transaction
```http
POST /transactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "vendor": "Starbucks",
  "amount": 5.50,
  "category": "Food",
  "date": "2025-01-15"
}

Response: 201
{ "id", "user_id", "vendor", "amount", "category", "date", "created_at" }
```

Note: Publishing to Pub/Sub occurs automatically after transaction creation.

#### Get Transactions
```http
GET /transactions?limit=50&offset=0
Authorization: Bearer {token}

Response: 200
[
  { "id", "user_id", "vendor", "amount", "category", "date", "created_at" }
]
```

#### Update Transaction
```http
PATCH /transactions/{transactionId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 6.00
}

Response: 200
{ "id", "user_id", "vendor", "amount", "category", "date", "created_at" }
```

#### Delete Transaction
```http
DELETE /transactions/{transactionId}
Authorization: Bearer {token}

Response: 204 No Content
```

### Goals

#### Create Goal
```http
POST /goals
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Vacation Fund",
  "target_amount": 1000
}

Response: 201
{ "id", "user_id", "title", "target_amount", "current_amount", "created_at" }
```

#### Get Goals
```http
GET /users/{userId}/goals
Authorization: Bearer {token}

Response: 200
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Vacation Fund",
    "target_amount": 1000,
    "current_amount": 250,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

#### Update Goal
```http
PATCH /goals/{goalId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "target_amount": 1500
}

Response: 200
{ "id", "user_id", "title", "target_amount", "current_amount", "created_at" }
```

#### Delete Goal
```http
DELETE /goals/{goalId}
Authorization: Bearer {token}

Response: 204 No Content
```

### Rules

#### Create Rule
```http
POST /rules
Authorization: Bearer {token}
Content-Type: application/json

{
  "vendor_match": "Starbucks",
  "save_amount": 2.00,
  "rule_type": "vendor-match"
}

Response: 201
{ "id", "user_id", "vendor_match", "save_amount", "rule_type", "is_active", "created_at" }
```

#### Get Rules
```http
GET /users/{userId}/rules
Authorization: Bearer {token}

Response: 200
[
  { "id", "user_id", "vendor_match", "save_amount", "rule_type", "is_active", "created_at" }
]
```

#### Update Rule
```http
PATCH /rules/{ruleId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "save_amount": 3.00,
  "is_active": true
}

Response: 200
{ "id", "user_id", "vendor_match", "save_amount", "rule_type", "is_active", "created_at" }
```

#### Delete Rule
```http
DELETE /rules/{ruleId}
Authorization: Bearer {token}

Response: 204 No Content
```

#### Toggle Automated Rule
```http
PATCH /rules/automated/{type}
Authorization: Bearer {token}
Content-Type: application/json

{
  "enabled": true
}

Response: 200
{
  "message": "round-up rules enabled",
  "affected_rules": [...]
}
```

### Reports

#### Dashboard Analytics
```http
GET /users/{userId}/reports/dashboard
Authorization: Bearer {token}

Response: 200
{
  "savings_trend": [
    { "month": "Jan", "amount": 120 },
    { "month": "Feb", "amount": 150 }
  ],
  "expense_by_category": [
    { "category": "Food", "amount": 450 },
    { "category": "Rent", "amount": 1200 }
  ],
  "income_saved_percentage": 15.5
}
```

## Architecture

### Technology Stack
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Messaging**: Google Cloud Pub/Sub for transaction events

### Security
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with configurable expiration
- Row-level ownership validation on all endpoints
- CORS enabled for frontend integration

### Database Schema
The API uses the existing Supabase database schema with these main tables:
- `profiles` - User accounts with password_hash
- `transactions` - Financial transactions
- `goals` - Savings goals
- `rules` - Automated savings rules
- `savings_actions` - Individual savings events

## Development

### Project Structure
```
backend/
├── src/
│   ├── config/         # Database and Pub/Sub configuration
│   ├── controllers/    # Request handlers
│   ├── middleware/     # JWT authentication
│   ├── routes/         # API route definitions
│   ├── types/          # TypeScript interfaces
│   └── server.ts       # Main application entry
├── package.json
└── tsconfig.json
```

### Testing
```bash
# Health check
curl http://localhost:3001/health
```
