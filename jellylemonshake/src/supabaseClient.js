import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pydyomeslsvbeirzisym.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZHlvbWVzbHN2YmVpcnppc3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0Njc3MTIsImV4cCI6MjA2OTA0MzcxMn0.tOk0nXqkFAUIBJTMkjnSmH8gHHf4gJlLzmuNAFbMhOw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 