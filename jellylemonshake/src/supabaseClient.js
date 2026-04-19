import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

const isValidSupabaseUrl = (url) => {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
	} catch {
		return false;
	}
};

export const isSupabaseConfigured = isValidSupabaseUrl(supabaseUrl) && !!supabaseAnonKey;

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;