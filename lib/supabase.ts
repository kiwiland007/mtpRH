
import { createClient } from '@supabase/supabase-js';

// Configuration de l'URL et de la clé anonyme Supabase
const supabaseUrl = 'https://spxdwoalvmchqyiogrth.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweGR3b2Fsdm1jaHF5aW9ncnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDkzMTEsImV4cCI6MjA4MzI4NTMxMX0.J4QryqCLMUKOi7SQnW4B7seIAozHJriAG6jzEA2HhLE';

export const supabase = createClient(supabaseUrl, supabaseKey);
