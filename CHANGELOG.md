# Historique des Modifications - v5.0 (Administration Avancée)

## 📅 07 Janvier 2026

### 🛡️ Sécurité et Permissions
- **Correction des permissions de modification profil** : Implémentation d'une vérification stricte des rôles (`ADMIN` ou `HR`) avant toute modification en base de données dans `AdminPanel`.
- **Mécanisme d'audit** : Ajout de la journalisation systématique (Audit Logs) pour les actions critiques (Création, Modification, Suppression, Clean Demo).

### 🧮 Moteur de Calcul (Code du Travail Maroc)
- **Calcul des Reports** : Refonte de la logique dans `calculations.ts` pour distinguer :
  - *Droit Annuel Courant* (basé sur l'ancienneté)
  - *Report N-1* (Solde excédant le droit annuel courant)
- **Ajustement Manuel** : Ajout d'un champ `balance_adjustment` dans le profil utilisateur pour permettre aux RH de corriger manuellement le solde (import initial, régularisation exceptionnelle).
- **Plafond Ancienneté** : Vérification du plafond de 30 jours ouvrables par an (Articles 231 & 241).

### 🚀 Fonctionnalités
- **Panel Administration** :
  - Ajout onglet **Historique** avec filtres (Employé, Statut).
  - Ajout onglet **Reports** avec visualisation "Action Requise" pour les soldes excessifs.
  - Ajout onglet **Logs** pour la traçabilité.
- **Actions Utilisateur** :
  - Archivage (Soft Delete) via le switch "Compte Actif".
  - Lien direct vers l'historique personnel depuis la liste des utilisateurs.
  - Export CSV des données RH (Solde, Reports, etc.).

### 🔧 Base de Données
- Ajout colonne `is_active` (boolean) sur `profiles`.
- Ajout colonne `balance_adjustment` (numeric) sur `profiles`.
- Création table `audit_logs`.
