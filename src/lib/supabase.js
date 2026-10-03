import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ilkvmjgwylxevoxdqhjw.supabase.co";

const supabasePublishableKey = "sb_publishable_tseNvX3vqOla3hg8GtGb7w_P9jAmcxB";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export default supabase;
