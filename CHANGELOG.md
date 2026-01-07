# Historique des Modifications - v5.0 (Administration Avancée)

## 📅 07 Janvier 2026

### 🛡️ Sécurité et Permissions
- **Correction des permissions de modification profil** : Implémentation d'une vérification stricte des rôles (`ADMIN` ou `HR`) avant toute modification en base de données dans `AdminPanel`.
# Changelog

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
