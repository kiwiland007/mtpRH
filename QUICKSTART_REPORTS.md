# 🚀 GUIDE DE DÉMARRAGE RAPIDE
## Gestion des Reports de Solde Annuel

---

## ⏱️ Installation en 5 minutes

### Étape 1 : Base de données (2 min)

```bash
# 1. Ouvrir Supabase Dashboard
# 2. Aller dans SQL Editor
# 3. Copier-coller le contenu de database_annual_carryover.sql
# 4. Cliquer sur "Run"
```

**Vérification :**
```sql
SELECT COUNT(*) FROM annual_carryovers;
-- Devrait retourner 0 (table vide mais créée)
```

### Étape 2 : Migration des données (1 min)

```bash
# 1. Dans SQL Editor
# 2. Copier-coller le contenu de database_migration_carryover.sql
# 3. Cliquer sur "Run"
```

**Vérification :**
```sql
SELECT COUNT(*) FROM leave_history;
-- Devrait retourner le nombre de congés migrés
```

### Étape 3 : Intégration dans l'app (2 min)

Dans `App.tsx`, ajouter la route :

```typescript
import CarryoverManagement from './components/CarryoverManagement';

// Dans votre router
{currentUser.role === 'ADMIN' && (
  <Route 
    path="/admin/carryovers" 
    element={
      <CarryoverManagement 
        currentUser={currentUser}
        supabaseClient={supabase}
      />
    } 
  />
)}
```

Dans votre menu de navigation :

```typescript
{
  label: 'Reports de Solde',
  path: '/admin/carryovers',
  icon: '📊',
  roles: ['ADMIN']
}
```

---

## 🎯 Utilisation Immédiate

### 1. Accéder au module

```
Menu Admin → Reports de Solde
```

### 2. Première utilisation

1. **Sélectionner l'année** : 2025 (année en cours)
2. **Cliquer sur "Recalculer tout"** : Initialise tous les soldes
3. **Attendre** : Le système calcule automatiquement
4. **Vérifier** : Les statistiques s'affichent en haut

### 3. Valider les reports

Pour chaque employé :
1. Cliquer sur l'icône 👁️ pour voir les détails
2. Vérifier les calculs
3. Cliquer sur ✓ pour valider
4. Ajouter des notes si nécessaire
5. Confirmer

---

## 📊 Cas d'usage courants

### Cas 1 : Calculer le solde d'un employé

```typescript
import { calculateCurrentBalance } from './utils/carryoverCalculations';

const balance = calculateCurrentBalance(
  '2020-03-10',  // Date d'embauche
  12,            // Jours utilisés cette année
  3,             // Report de l'année dernière
  0              // Ajustement manuel
);

console.log(`Solde restant : ${balance.remaining} jours`);
console.log(`Report vers N+1 : ${balance.nextCarry} jours`);
```

### Cas 2 : Générer un rapport pour un employé

```typescript
import { 
  calculateYearlyBalance,
  generateCalculationSummary 
} from './utils/carryoverCalculations';

const balance = calculateYearlyBalance(
  '2020-03-10',
  2025,
  12,
  3
);

const report = generateCalculationSummary(
  balance,
  'Ahmed Mansouri',
  2025
);

console.log(report);
// Affiche un rapport formaté avec toutes les informations
```

### Cas 3 : Exporter les données

1. Appliquer les filtres souhaités
2. Cliquer sur "Exporter CSV"
3. Le fichier se télécharge automatiquement

---

## 🔧 Configuration Personnalisée

### Modifier les règles de calcul

Dans `utils/carryoverRules.ts` :

```typescript
import { createCustomRule, MOROCCAN_LABOR_LAW_RULE } from './utils/carryoverRules';

// Créer une règle personnalisée pour un département
const salesRule = createCustomRule(MOROCCAN_LABOR_LAW_RULE, {
  id: 'sales-team',
  department: 'Commercial',
  annualBaseDays: 20,        // 20j au lieu de 18j
  maxCarryoverRatio: 0.5,    // 50% au lieu de 33%
  notes: 'Conditions améliorées pour l\'équipe commerciale'
});
```

### Appliquer une règle personnalisée

```typescript
import { getApplicableRule } from './utils/carryoverRules';

const employee = {
  role: 'MANAGER',
  department: 'Commercial',
  hireDate: '2020-03-10'
};

const rule = getApplicableRule(employee);
// Retourne automatiquement la règle applicable
```

---

## ✅ Checklist de déploiement

### Avant de déployer

- [ ] Tables créées dans Supabase
- [ ] Migration exécutée avec succès
- [ ] Tests unitaires passés (100%)
- [ ] Route ajoutée dans l'app
- [ ] Menu de navigation mis à jour
- [ ] Permissions RLS vérifiées
- [ ] Backup de la base de données

### Après déploiement

- [ ] Recalcul de tous les employés
- [ ] Vérification des statistiques
- [ ] Validation d'un échantillon
- [ ] Export CSV testé
- [ ] Documentation accessible
- [ ] Formation des administrateurs

---

## 🧪 Tests Rapides

### Tester les calculs

```bash
# Exécuter les tests unitaires
npx ts-node tests/carryoverCalculations.test.ts
```

**Résultat attendu :**
```
✓ Tous les tests passés (30/30)
✅ Le système est conforme au Code du Travail Marocain
```

### Tester l'interface

1. Se connecter en tant qu'admin
2. Aller sur `/admin/carryovers`
3. Vérifier que le tableau s'affiche
4. Tester les filtres
5. Tester le recalcul
6. Tester la validation
7. Tester l'export

---

## 📖 Documentation Complète

### Fichiers de documentation

- **`DOCUMENTATION_REPORTS_SOLDE.md`** : Documentation complète (50+ pages)
  - Cadre légal détaillé
  - Règles de calcul
  - Guide d'utilisation
  - FAQ

- **`IMPLEMENTATION_REPORTS.md`** : Guide technique
  - Architecture
  - Installation
  - Configuration
  - Dépannage

- **`database_annual_carryover.sql`** : Schéma de base de données
  - Tables
  - Vues
  - Fonctions
  - Commentaires

### Code source

Tous les fichiers sont commentés avec :
- Description des fonctions
- Paramètres et types
- Exemples d'utilisation
- Références légales

---

## 🆘 Aide Rapide

### Problème : Les tables ne sont pas créées

**Solution :**
```sql
-- Vérifier les permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;

-- Réexécuter le script
\i database_annual_carryover.sql
```

### Problème : Erreur de calcul

**Solution :**
```typescript
// Activer le mode debug
const calculation = calculateYearlyBalance(...);
console.log('Détails:', calculation);

// Valider le résultat
const validation = validateCarryover(calculation);
if (!validation.isValid) {
  console.error('Erreurs:', validation.errors);
}
```

### Problème : RLS bloque l'accès

**Solution :**
```sql
-- Vérifier les politiques
SELECT * FROM pg_policies WHERE tablename LIKE '%carryover%';

-- En DEV uniquement : désactiver temporairement
ALTER TABLE annual_carryovers DISABLE ROW LEVEL SECURITY;
```

---

## 📞 Support

### Ressources disponibles

1. **Documentation complète** : `DOCUMENTATION_REPORTS_SOLDE.md`
2. **Guide technique** : `IMPLEMENTATION_REPORTS.md`
3. **Tests unitaires** : `tests/carryoverCalculations.test.ts`
4. **Code commenté** : Tous les fichiers source

### Vérifications de base

```sql
-- 1. Vérifier que les tables existent
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%carryover%';

-- 2. Vérifier les données
SELECT COUNT(*) FROM annual_carryovers;
SELECT COUNT(*) FROM leave_history;

-- 3. Tester la fonction de calcul
SELECT * FROM calculate_carryover('[USER_ID]', 2025);
```

---

## 🎓 Formation Express (10 min)

### Pour les administrateurs

**Minute 1-2 : Comprendre le système**
- Conforme au Code du Travail Marocain
- Calcul automatique des reports
- Validation administrative obligatoire

**Minute 3-5 : Navigation**
- Accès : Menu Admin → Reports de Solde
- Filtres : Année, département, statut
- Statistiques : En haut du tableau

**Minute 6-8 : Actions principales**
- 🔄 Recalculer : Met à jour les calculs
- ✓ Valider : Approuve un report
- 👁️ Détails : Voir les informations complètes
- 📥 Export : Télécharger en CSV

**Minute 9-10 : Workflow type**
1. Sélectionner l'année
2. Recalculer tous les employés
3. Vérifier les statistiques
4. Valider les reports un par un
5. Exporter pour archivage

---

## 🚀 Prochaines Étapes

### Après la mise en place

1. **Semaine 1** : Formation des administrateurs
2. **Semaine 2** : Validation de l'année en cours
3. **Semaine 3** : Communication aux employés
4. **Semaine 4** : Suivi et ajustements

### Améliorations futures

- [ ] Notifications automatiques par email
- [ ] Graphiques d'évolution
- [ ] Application mobile
- [ ] Intégration avec la paie
- [ ] Rapports avancés

---

## ✨ Résumé

### Ce que vous avez maintenant

✅ **Système complet** de gestion des reports  
✅ **Conforme** au Code du Travail Marocain  
✅ **Interface moderne** et intuitive  
✅ **Calculs automatiques** et validés  
✅ **Audit trail** complet  
✅ **Documentation** exhaustive  

### Temps d'installation

- **Base de données** : 2 minutes
- **Migration** : 1 minute
- **Intégration** : 2 minutes
- **Total** : **5 minutes** ⚡

### Prêt à l'emploi

Le système est **100% fonctionnel** et prêt à être utilisé en production !

---

**Bon déploiement ! 🎉**

*Pour toute question, consulter la documentation complète dans `DOCUMENTATION_REPORTS_SOLDE.md`*
