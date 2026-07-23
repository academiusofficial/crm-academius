import { createClient } from "@supabase/supabase-js";

// === CONFIGURATION ===
const SUPABASE_URL = "https://icmsfhkadtifwcxwnfan.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_ghpL7xni-lCyySc3dEyVXw_x1W8zxYT";

// Initialize and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
