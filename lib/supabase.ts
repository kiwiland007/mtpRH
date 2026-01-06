
import { createClient } from '@supabase/supabase-js';

// Configuration de l'URL et de la clé anonyme Supabase depuis les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://spxdwoalvmchqyiogrth.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweGR3b2Fsdm1jaHF5aW9ncnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDkzMTEsImV4cCI6MjA4MzI4NTMxMX0.J4QryqCLMUKOi7SQnW4B7seIAozHJriAG6jzEA2HhLE';

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Variables d\'environnement Supabase manquantes. Vérifiez votre fichier .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
