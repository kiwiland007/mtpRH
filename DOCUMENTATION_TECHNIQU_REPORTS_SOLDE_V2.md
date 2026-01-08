
# Documentation Technique : Système de Gestion des Reports de Solde v2.0

## 1. Architecture du Système

Le système de gestion des reports de solde est conçu pour assurer la conformité avec le Code du Travail Marocain tout en offrant une expérience utilisateur fluide et automatisée.

### Composants Clés :
- **adminService.ts** : Couche de service centralisant toutes les opérations CRUD et la logique métier complexe liée aux reports.
- **carryoverCalculations.ts** : Moteur de calcul pur, incluant les règles d'ancienneté (Art. 231/241) et de report (Art. 242).
- **CarryoverManagement.tsx** : Interface d'administration haut de gamme utilisant des composants modulaires.
- **CarryoverMetrics.tsx** : Tableau de bord analytique en temps réel.

## 2. Logique Métier (Rappel Légal)

### Calcul du droit annuel :
- Base : 1.5 jour par mois (18j par an).
- Seniorité : +1.5 jour par tranche de 5 ans d'ancienneté.
- Plafond : 30 jours au total.

### Calcul du report (Art. 242) :
- La limite de report autorisée vers l'année N+1 est fixe à **1/3 du droit annuel acquis**.
- Formule : `min(Solde_Restant, Droit_Annuel / 3)`
- Les jours dépassant cette limite sont automatiquement marqués comme "Jours Perdus" (Forfeited).

## 3. Schéma de Données (Supabase)

### Table `annual_carryovers`
- `user_id` (uuid, PK)
- `year` (int, PK)
- `accrued_days` (float) : Jours acquis dans l'année.
- `used_days` (float) : Jours consommés (historique automatique).
- `used_days_adjustment` (float) : Correction manuelle admin.
- `remaining_days` (float) : Solde théorique total.
- `next_carryover` (float) : Montant reporté à l'année suivante.
- `status` (enum) : DRAFT, PENDING, VALIDATED, LOCKED.

### Table `carryover_audit`
- Système de journalisation complet (Action, Performeur, Raison, Nouvelles Valeurs).

## 4. API Service (`adminService`)

- `fetchCarryovers(year, status, department)` : Récupération optimisée avec filtres.
- `upsertCarryover(data)` : Mise à jour ou création atomique.
- `logCarryoverAudit(id, action, by, reason, details)` : Traçabilité totale.

## 5. Performance & Optimisation
- Utilisation de `Promise.all` pour les chargements parallèles.
- Filtrage local hybride pour une recherche instantanée (UX 60fps).
- Recalculs à la demande ou en masse.
