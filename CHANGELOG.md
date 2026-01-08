# Changelog - mtpRH

Toutes les modifications notables apportées à ce projet seront documentées dans ce fichier.

## [6.0.0] - 2026-01-08
### Added - Gestion des Reports de Solde Annuel
- **Système complet de gestion des reports** conforme au Code du Travail Marocain (Dahir n° 1-03-194)
  
#### Base de données
- **4 nouvelles tables SQL**:
  - `annual_carryovers`: Gestion des reports de solde par année et par employé
  - `leave_history`: Historique complet de tous les congés avec traçabilité
  - `carryover_audit`: Audit trail de toutes les modifications (conservation 5 ans)
  - `carryover_rules`: Règles de calcul configurables par département/catégorie
- **2 vues SQL consolidées**:
  - `v_employee_balances`: Vue consolidée des soldes par employé
  - `v_pending_carryovers`: Reports en attente de validation
- **3 fonctions SQL automatisées**:
  - `calculate_carryover()`: Calcul automatique conforme à la législation
  - `update_updated_at_column()`: Mise à jour automatique des timestamps
  - `sync_leave_to_history()`: Synchronisation automatique des congés approuvés

#### Interface d'administration
- **Composant CarryoverManagement.tsx** (800+ lignes):
  - Tableau de bord consolidé avec statistiques en temps réel
  - Filtres avancés (année, département, statut, recherche)
  - Recalcul automatique (individuel et en masse)
  - Validation administrative avec workflow d'approbation
  - Modales détaillées avec informations complètes
  - Export CSV des données filtrées
  - Notifications en temps réel
  - Design moderne avec glassmorphism et animations

#### Calculs automatisés
- **15+ fonctions TypeScript** conformes à la législation marocaine:
  - `calculateYearsOfService()`: Calcul précis de l'ancienneté
  - `calculateAnnualEntitlement()`: Droit annuel selon Art. 231 + 241
  - `calculateMaxCarryover()`: Limite de report (Art. 242 : 1/3 du droit)
  - `calculateYearlyBalance()`: Solde complet pour une année
  - `calculateCurrentBalance()`: Solde actuel avec ajustements
  - `calculateProrataAccrual()`: Calcul au prorata pour nouveaux employés
  - `validateCarryover()`: Vérification de conformité réglementaire
  - `generateCalculationSummary()`: Génération de rapports détaillés
  - `calculateMultiYearHistory()`: Historique sur plusieurs années
  - Et plus...

#### Règles configurables
- **Système de règles flexible** avec validation de conformité:
  - Règle par défaut conforme au Code du Travail Marocain
  - Règles personnalisables par département ou rôle
  - Validation automatique des minimums légaux
  - Exemples pré-configurés (cadres, IT, nouveaux employés)

#### Tests et qualité
- **Suite de tests complète** (30 tests unitaires):
  - Tests de calcul de l'ancienneté
  - Tests du droit annuel (Art. 231 + 241)
  - Tests de la limite de report (Art. 242)
  - Tests de calcul complet du solde
  - Tests au prorata
  - Tests de validation de conformité
  - Tests de cas réels d'usage
  - Taux de réussite attendu: 100%

#### Documentation
- **90+ pages de documentation complète**:
  - `DOCUMENTATION_REPORTS_SOLDE.md` (50+ pages): Documentation exhaustive
  - `IMPLEMENTATION_REPORTS.md` (30+ pages): Guide technique
  - `QUICKSTART_REPORTS.md` (10+ pages): Démarrage rapide en 5 minutes
  - `RECAP_IMPLEMENTATION.md`: Récapitulatif de livraison
  - Cadre légal détaillé avec références aux articles
  - Règles de calcul avec exemples concrets
  - Guide d'utilisation administrateur
  - FAQ et cas d'usage
  - Architecture technique
  - Checklist de déploiement

### Features - Conformité légale
- ✅ **Article 231**: Droit au congé annuel (1.5j/mois = 18j/an)
- ✅ **Article 241**: Majoration d'ancienneté (+1.5j/5ans, max 30j)
- ✅ **Article 242**: Report limité à 1/3 du droit annuel
- ✅ **Article 243**: Conservation des documents (5 ans minimum)

### Security
- **Chiffrement des données sensibles** avec connexion HTTPS obligatoire
- **Row Level Security (RLS)** activé sur toutes les tables
- **Audit trail complet** avec traçabilité de toutes les modifications
- **Contrôle d'accès** réservé aux administrateurs
- **Sauvegarde automatique** pour conformité réglementaire

### Engineering
- **~3000 lignes de code** produites (TypeScript + SQL)
- **~2000 lignes de documentation**
- **Migration automatique** des données existantes
- **Synchronisation en temps réel** des congés approuvés
- **Optimisation des requêtes** avec index SQL
- **Code commenté** avec références légales
- **Architecture modulaire** et extensible

### Migration
- Script de migration automatique (`database_migration_carryover.sql`)
- Synchronisation de l'historique des congés existants
- Initialisation des reports pour l'année en cours et précédente
- Trigger automatique pour synchronisation continue
- Vérifications et statistiques de migration



## [5.4.0] - 2026-01-07
### Added
- **Global Code Audit**: Thorough review of all components for potential bugs and security flaws.
- **Robust Schema Fallbacks**: Enhanced database operations to gracefully handle schema mismatches with clear user instructions.
- **Admin Dashboard Pro**: Detailed analytics with department distribution and HR activity tracking.
- **Enhanced Type Safety**: Added missing React and DOM type definitions to resolve linting errors.

### Fixed
- **Profile Update Bug**: Resolved "manager_id" column missing error during profile updates.
- **JSX Structure**: Repaired broken JSX flow in AdminPanel that was causing UI rendering issues.
- **Validation Consistency**: Unified input validation across all forms.
- **Hierarchy Mapping**: Fixed a bug where manager IDs were not correctly persisted if they were empty.

## [5.3.0] - 2026-01-07
### Added
- **Hierarchy Management**: New `manager_id` field in profiles allowing for a complete organizational chart.
- **Root-Admin Modifiability**: The primary admin account is now a fully editable record, allowing its identity and role to be transferred.
- **Dynamic Profile Sync**: The application now syncs the current user session with database changes in real-time.

## [5.1.0] - 2026-01-07
### Added
- **Admin Create Leave**: Administrators can now create and auto-approve leave requests on behalf of any employee.
- **Editable Profiles**: Complete overhaul of the "My Profile" modal to allow users to update their information (excluding Hire Date).
- **Admin Request Validation**: New "New Request" button in the Admin Panel's Validation view for quick entry.

### Fixed
- **Profile Modal Lock**: Fixed a bug where the profile modal was read-only, preventing users from updating their own details.
- **Role Coherence**: Improved access rights verification for administrative actions.

## [5.0.0] - 2026-01-06
### Added
- **Administration Avancée (v5.0)**:
    - Gestion CRUD complète des profils utilisateurs (Nom, Email, Rôle, Département, Date d'embauche).
    - Activation/Désactivation des comptes (Soft-delete via `is_active`).
    - Réinitialisation du mot de passe (Email via Supabase Auth).
    - Gestion des préférences utilisateurs (JSONB).
    - Modification directe des demandes de congés (Dates, Type, Durée).
    - Historique complet des décisions avec commentaires managers.
    - Audit Trail : Journalisation de toutes les actions administratives dans `audit_logs`.
    - Analyse détaillée des soldes (Calculs avancés incluant le report et l'ajustement manuel).
    - Reporting en temps réel sous forme de dashboard (Visualisation par département).
    - Nettoyage sécurisé de la base de démonstration (Reset complet sauf Admin).

### Security
- Implémentation du contrôle d'accès basé sur les rôles (RBAC) pour toutes les fonctions critiques.
- Logs d'audit obligatoires pour la conformité et la traçabilité.

### Engineering
- Intégration de `calculateBalanceAnalysis` pour une précision accrue des soldes de congés.
- Optimisation des performances du chargement des données administratives.
