# 🎯 GESTION DES REPORTS DE SOLDE ANNUEL

## Vue d'ensemble

Système complet de gestion des reports de solde de congés annuels, conforme au **Code du Travail Marocain** (Dahir n° 1-03-194).

### ✨ Fonctionnalités principales

- ✅ **Interface d'administration complète** avec tableau de bord consolidé
- ✅ **Calculs automatisés** conformes à la législation marocaine
- ✅ **Validation administrative** avec workflow d'approbation
- ✅ **Historique complet** de tous les congés et modifications
- ✅ **Audit trail** avec traçabilité totale
- ✅ **Sécurité renforcée** avec chiffrement et RLS
- ✅ **Export et rapports** réglementaires

---

## 📁 Structure des fichiers

```
mtpRH/
├── database_annual_carryover.sql       # Schéma de base de données
├── types.ts                            # Types TypeScript (mis à jour)
├── utils/
│   └── carryoverCalculations.ts        # Fonctions de calcul
├── components/
│   └── CarryoverManagement.tsx         # Interface d'administration
├── tests/
│   └── carryoverCalculations.test.ts   # Tests unitaires
├── DOCUMENTATION_REPORTS_SOLDE.md      # Documentation complète
└── IMPLEMENTATION_REPORTS.md           # Ce fichier
```

---

## 🚀 Installation

### 1. Base de données

Exécuter le script SQL pour créer les tables :

```bash
# Via Supabase Dashboard
# Copier le contenu de database_annual_carryover.sql
# Coller dans SQL Editor et exécuter

# Ou via psql
psql -h [SUPABASE_HOST] -U postgres -d postgres -f database_annual_carryover.sql
```

**Tables créées :**
- `annual_carryovers` : Reports de solde annuel
- `leave_history` : Historique des congés
- `carryover_audit` : Audit trail
- `carryover_rules` : Règles de calcul

**Vues créées :**
- `v_employee_balances` : Vue consolidée
- `v_pending_carryovers` : Reports en attente

**Fonctions créées :**
- `calculate_carryover(user_id, year)` : Calcul automatique
- `update_updated_at_column()` : Mise à jour timestamps

### 2. Vérification

```sql
-- Vérifier que les tables existent
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%carryover%';

-- Vérifier la règle par défaut
SELECT * FROM carryover_rules WHERE is_default = true;

-- Tester la fonction de calcul
SELECT * FROM calculate_carryover('[USER_ID]', 2025);
```

---

## 💻 Utilisation

### Intégration dans l'application

#### 1. Importer le composant

```typescript
import CarryoverManagement from './components/CarryoverManagement';
```

#### 2. Ajouter au menu admin

Dans `App.tsx` ou votre router :

```typescript
{currentUser.role === 'ADMIN' && (
  <Route path="/admin/carryovers" element={
    <CarryoverManagement 
      currentUser={currentUser}
      supabaseClient={supabase}
    />
  } />
)}
```

#### 3. Ajouter au menu de navigation

```typescript
{
  label: 'Reports de Solde',
  path: '/admin/carryovers',
  icon: '📊',
  roles: ['ADMIN']
}
```

### Utilisation des fonctions de calcul

```typescript
import { 
  calculateYearlyBalance,
  calculateCurrentBalance,
  validateCarryover,
  generateCalculationSummary
} from './utils/carryoverCalculations';

// Calculer le solde pour une année
const balance = calculateYearlyBalance(
  '2020-03-10',  // Date d'embauche
  2025,          // Année
  12,            // Jours utilisés
  3              // Report N-1
);

// Valider le calcul
const validation = validateCarryover(balance);
if (!validation.isValid) {
  console.error('Erreurs:', validation.errors);
}

// Générer un rapport
const summary = generateCalculationSummary(
  balance,
  'Ahmed Mansouri',
  2025
);
console.log(summary);
```

---

## 📊 Règles de calcul

### Conformité légale

Le système applique automatiquement les règles du **Code du Travail Marocain** :

#### Article 231 : Droit au congé annuel
- **1,5 jours par mois** de travail effectif
- **18 jours par an** pour une année complète

#### Article 241 : Majoration d'ancienneté
- **+1,5 jours** tous les **5 ans** de service
- **Plafond : 30 jours** maximum par an

#### Article 242 : Report des congés
- **Report limité à 1/3** du droit annuel
- Jours excédentaires **perdus**
- Délai d'utilisation : **3 mois**

### Exemples de calcul

#### Employé avec 5 ans d'ancienneté

```
Droit annuel : 18 + (1 × 1,5) = 19,5 jours
Report N-1 : 3 jours
Utilisés : 12 jours
Solde : 19,5 + 3 - 12 = 10,5 jours
Limite report : 19,5 × 1/3 = 6,5 jours
Report N+1 : 6,5 jours
Perdus : 10,5 - 6,5 = 4 jours
```

#### Employé avec 20 ans d'ancienneté

```
Droit annuel : 18 + (4 × 1,5) = 24 jours
Report N-1 : 8 jours
Utilisés : 20 jours
Solde : 24 + 8 - 20 = 12 jours
Limite report : 24 × 1/3 = 8 jours
Report N+1 : 8 jours
Perdus : 12 - 8 = 4 jours
```

---

## 🧪 Tests

### Exécuter les tests

```bash
# Avec ts-node
npx ts-node tests/carryoverCalculations.test.ts

# Ou avec votre test runner
npm test tests/carryoverCalculations.test.ts
```

### Couverture des tests

- ✅ Calcul de l'ancienneté
- ✅ Calcul du droit annuel (Art. 231 + 241)
- ✅ Limite de report (Art. 242)
- ✅ Calcul complet du solde
- ✅ Calcul au prorata (nouveaux employés)
- ✅ Validation de conformité
- ✅ Cas réels d'usage

**Résultat attendu :** 100% de réussite

---

## 🔒 Sécurité

### Contrôle d'accès

- **RLS activé** sur toutes les tables
- **Accès réservé** aux administrateurs
- **Audit trail** de toutes les actions

### Chiffrement

- ✅ Connexion HTTPS obligatoire
- ✅ Données sensibles chiffrées
- ✅ Tokens sécurisés

### Conservation (Art. 243)

- **Durée minimale** : 5 ans
- **Sauvegarde automatique** : Quotidienne
- **Format non modifiable** : Archivage

---

## 📖 Documentation

### Documentation complète

Voir `DOCUMENTATION_REPORTS_SOLDE.md` pour :
- Cadre légal détaillé
- Règles de calcul complètes
- Guide d'utilisation administrateur
- FAQ et cas d'usage
- Exemples de calculs

### Documentation technique

Tous les fichiers sont commentés avec :
- Description des fonctions
- Paramètres et types
- Exemples d'utilisation
- Références légales

---

## 🎨 Interface utilisateur

### Design moderne

- **Glassmorphism** et dégradés
- **Animations fluides**
- **Responsive design**
- **Accessibilité** optimisée

### Fonctionnalités UI

- **Filtres avancés** : Année, département, statut, recherche
- **Statistiques** : Totaux, validés, en attente, perdus
- **Actions en masse** : Recalcul de tous les employés
- **Export CSV** : Données filtrées
- **Modales détaillées** : Informations complètes
- **Notifications** : Feedback en temps réel

---

## 🔄 Workflow administrateur

### 1. Consultation des reports

1. Accéder au module "Reports de Solde"
2. Sélectionner l'année fiscale
3. Appliquer les filtres (département, statut)
4. Consulter le tableau consolidé

### 2. Recalcul

**Individuel :**
- Cliquer sur 🔄 pour un employé
- Vérification automatique de conformité
- Mise à jour du statut à PENDING

**En masse :**
- Cliquer sur "Recalculer tout"
- Traitement de tous les employés actifs
- Notification du résultat

### 3. Validation

1. Cliquer sur ✓ pour valider
2. Vérifier les informations
3. Ajouter des notes (optionnel)
4. Confirmer la validation
5. Statut passe à VALIDATED

### 4. Audit

- Toutes les actions sont enregistrées
- Consultation de l'historique
- Traçabilité complète

---

## 📊 Statistiques et rapports

### Tableau de bord

- **Total employés** : Nombre d'enregistrements
- **Validés** : Reports approuvés
- **En attente** : À valider
- **Jours perdus** : Total des forfeitures

### Export CSV

Colonnes exportées :
- Employé
- Département
- Année
- Jours Acquis
- Jours Utilisés
- Solde Restant
- Report N-1
- Report N+1
- Jours Perdus
- Statut

---

## 🐛 Dépannage

### Problèmes courants

#### Les tables ne sont pas créées
```sql
-- Vérifier les permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

#### Erreur de calcul
```typescript
// Activer le mode debug
const calculation = calculateYearlyBalance(...);
console.log('Détails:', calculation);

// Valider le résultat
const validation = validateCarryover(calculation);
console.log('Validation:', validation);
```

#### RLS bloque l'accès
```sql
-- Vérifier les politiques
SELECT * FROM pg_policies WHERE tablename LIKE '%carryover%';

-- Temporairement désactiver (DEV ONLY)
ALTER TABLE annual_carryovers DISABLE ROW LEVEL SECURITY;
```

---

## 🚀 Prochaines étapes

### Améliorations possibles

1. **Notifications automatiques**
   - Email aux employés lors de validation
   - Rappels pour reports expirant bientôt

2. **Rapports avancés**
   - Graphiques d'évolution
   - Comparaisons inter-départements
   - Prévisions de charge

3. **Intégration paie**
   - Export vers système de paie
   - Calcul des indemnités

4. **Mobile app**
   - Consultation des soldes
   - Notifications push

---

## 📞 Support

### Ressources

- **Documentation** : `DOCUMENTATION_REPORTS_SOLDE.md`
- **Tests** : `tests/carryoverCalculations.test.ts`
- **Code source** : Commenté et documenté

### Contact

Pour toute question ou assistance technique, consulter :
1. La documentation complète
2. Les commentaires dans le code
3. L'audit trail pour diagnostic

---

## 📝 Changelog

### Version 1.0.0 (2026-01-08)

#### ✨ Nouvelles fonctionnalités
- Système complet de gestion des reports
- Interface d'administration moderne
- Calculs automatisés conformes à la loi
- Audit trail et sécurité
- Export et documentation

#### 🔧 Technique
- 4 nouvelles tables SQL
- 2 vues consolidées
- 1 fonction de calcul SQL
- 15+ fonctions TypeScript
- Suite de tests complète

#### 📚 Documentation
- Guide complet (50+ pages)
- Exemples de calculs
- FAQ détaillée
- Tests unitaires

---

## 📄 Licence et conformité

**Conforme au Code du Travail Marocain**  
Dahir n° 1-03-194 du 11 septembre 2003

**Articles appliqués :**
- Art. 231 : Droit au congé annuel
- Art. 241 : Majoration d'ancienneté
- Art. 242 : Report des congés
- Art. 243 : Conservation des documents

---

**Développé le 2026-01-08**  
**Système de gestion RH - MTP**
