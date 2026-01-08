
# Plan de Migration et Procédures de Rollback - Reports de Solde v2.0

## 1. Plan de Migration des Données

La migration s'effectue en trois phases pour garantir l'intégrité des calculs légaux.

### Phase 1 : Initialisation des Profils (Vérification)
- Vérifier que tous les collaborateurs ont une `hire_date` (date d'embauche) valide.
- *Requête de contrôle* : `SELECT id, full_name FROM profiles WHERE hire_date IS NULL;`

### Phase 2 : Synchronisation de l'Historique
- Exécuter le script de synchronisation (si non fait) pour refléter les demandes approuvées dans la table `leave_history`.
- Cette étape est critique car elle alimente la colonne `used_days` des reports.

### Phase 3 : Calcul Initial des Reports
- Utiliser la fonction "Recalculer tout" de la v2.0 pour l'année en cours (2025) et l'année précédente (2024).
- Cela générera les enregistrements dans `annual_carryovers` avec les nouveaux plafonds de 1/3.

## 2. Procédures de Rollback (Plan de Secours)

En cas d'échec critique du nouveau système v2.0 :

### Étape 1 : Restauration de l'Interface
- Revenir à la version précédente de `CarryoverManagement.tsx` et `AdminPanel.tsx` via Git.
- Le système restera fonctionnel car la base de données est rétrocompatible.

### Étape 2 : Nettoyage des Calculs Erronés (Si nécessaire)
- Si des recalculs de masse ont corrompu des validations :
- *Commande SQL* : `UPDATE annual_carryovers SET status = 'PENDING' WHERE status = 'VALIDATED' AND validated_at > 'DATE_DE_LA_MIGRATION';`

### Étape 3 : Restauration Database
- Si le schéma a été modifié de manière destructive (peu probable ici), restaurer le dernier snapshot de la base de données Supabase.

## 3. Critères de Validation du succès
- [ ] Les jours acquis correspondent aux bulletins de paie.
- [ ] Les rapports N+1 ne dépassent jamais 1/3 du droit annuel.
- [ ] L'audit trail enregistre correctement chaque correction.
