-- users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  total_saved NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Make sure demo_user exists
INSERT INTO users (id, email, total_saved)
VALUES ('demo_user', 'demo@pigmint.local', 0)
ON CONFLICT (id) DO NOTHING;

-- transactions
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL,
  merchant TEXT,
  category_raw TEXT,
  category_normalized TEXT,
  timestamp TIMESTAMP NOT NULL,
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- rules
CREATE TABLE IF NOT EXISTS rules (
  user_id TEXT REFERENCES users(id),
  name TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, name)
);

-- savings_ledger
CREATE TABLE IF NOT EXISTS savings_ledger (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  transaction_id INT REFERENCES transactions(id),
  rule_name TEXT,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- goals
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  deadline TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- goal_progress
CREATE TABLE IF NOT EXISTS goal_progress (
  id SERIAL PRIMARY KEY,
  goal_id INT REFERENCES goals(id),
  transaction_id INT REFERENCES transactions(id),
  amount_added NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  title TEXT,
  message TEXT,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
