/*
  # Update schema for guest checkout, email verification, and account deletion

  1. Changes to `orders`
    - Make `user_id` nullable (guests don't have an account)
    - Add `guest_email` column for guest order tracking
    - Add `email_verified` boolean to confirm guest email was verified

  2. New Table: `email_verifications`
    - `id` (uuid, primary key)
    - `email` (text, not null)
    - `code` (text, 4-digit code)
    - `verified` (boolean, default false)
    - `expires_at` (timestamptz)
    - `created_at` (timestamptz)
    - Used for guest checkout email verification flow

  3. New Table: `deleted_accounts`
    - `id` (uuid, primary key)
    - `user_id` (uuid, the deleted user's id)
    - `email` (text)
    - `deleted_at` (timestamptz)
    - Audit trail for account deletions

  4. Security
    - Enable RLS on new tables
    - Email verifications: service_role can insert/update (edge functions)
    - Anyone can insert a verification code (for guest flow)
    - Deleted accounts: service_role only
*/

-- Make user_id nullable on orders for guest checkout
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Add guest_email column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'guest_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN guest_email text;
  END IF;
END $$;

-- Add email_verified column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE orders ADD COLUMN email_verified boolean DEFAULT false;
  END IF;
END $$;

-- Create index on guest_email for lookups
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);

-- Email verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert verification codes"
  ON email_verifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read verification codes"
  ON email_verifications FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can update verification codes"
  ON email_verifications FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

-- Deleted accounts audit table
CREATE TABLE IF NOT EXISTS deleted_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  deleted_at timestamptz DEFAULT now()
);

ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage deleted accounts"
  ON deleted_accounts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
