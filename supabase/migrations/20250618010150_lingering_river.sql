/*
  # Create _test table for connection testing

  1. New Tables
    - `_test`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `_test` table
    - Add policy for authenticated users to read data
  
  3. Purpose
    - This table is used by the SupabaseTest component to verify database connectivity
    - Having this table prevents 404 errors in the browser console during connection tests
*/

CREATE TABLE IF NOT EXISTS _test (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE _test ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read test data"
  ON _test
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert a single test record to ensure the table is not empty
INSERT INTO _test (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;