import { createClient } from '@supabase/supabase-js';

const requiredEnvVars = {
  SUPABASE_URL: process.env.SUPABASE_URL?.trim(),
  SUPABASE_KEY: process.env.SUPABASE_KEY?.trim(),
};

const missingVariables = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVariables.length > 0) {
  const variablesList = missingVariables.join(', ');
  const hint =
    'Ensure these are defined in your environment or .env file. ' +
    'You can copy .env.example to .env and fill in the missing values.';

  throw new Error(`Supabase client initialization failed: Missing environment variable(s): ${variablesList}. ${hint}`);
}

let client;

export const getSupabaseClient = () => {
  if (!client) {
    client = createClient(requiredEnvVars.SUPABASE_URL, requiredEnvVars.SUPABASE_KEY);
  }

  return client;
};

const supabase = getSupabaseClient();

export default supabase;
