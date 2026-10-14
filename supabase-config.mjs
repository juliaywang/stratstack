// Publishable project identifiers, not server secrets. RLS protects every record.
export const supabaseUrl = process.env.SUPABASE_URL || 'https://masdbfkksqkpftinxgqn.supabase.co';
export const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_sMp1INzrK6VtmErraN3Vtw_WEUmrdwh';
export const usesSupabase = process.env.DATA_BACKEND !== 'legacy';
