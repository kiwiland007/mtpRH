# GESTION DES REPORTS DE SOLDE ANNUEL
## Système conforme au Code du Travail Marocain

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Cadre légal](#cadre-légal)
3. [Règles de calcul](#règles-de-calcul)
4. [Architecture technique](#architecture-technique)
5. [Guide d'utilisation](#guide-dutilisation)
6. [Sécurité et conformité](#sécurité-et-conformité)
7. [FAQ](#faq)

---

## 🎯 VUE D'ENSEMBLE

Le système de gestion des reports de solde annuel permet à l'administrateur de :

- ✅ **Visualiser** les soldes de congés de tous les employés
- ✅ **Calculer automatiquement** les reports conformément à la loi
- ✅ **Valider** les reports après vérification
- ✅ **Auditer** toutes les modifications avec traçabilité complète
- ✅ **Générer** des rapports et attestations réglementaires
- ✅ **Exporter** les données pour archivage

---

## ⚖️ CADRE LÉGAL

### Code du Travail Marocain (Dahir n° 1-03-194)

#### **Article 231 : Droit au congé annuel**
> *"Tout salarié a droit, après six mois de service continu dans la même entreprise ou chez le même employeur, à un congé annuel payé dont la durée est fixée à raison d'un jour et demi de travail effectif par mois de service."*

**Application :**
- **1,5 jours par mois** de travail effectif
- **18 jours par an** pour une année complète
- Calcul au prorata pour les périodes partielles

#### **Article 241 : Majoration d'ancienneté**
> *"La durée du congé annuel est augmentée à raison d'un jour et demi par période entière, continue ou non, de cinq années de service, sans toutefois que le cumul de la durée du congé annuel et de ses augmentations ne puisse dépasser trente jours de travail effectif."*

**Application :**
- **+1,5 jours** tous les **5 ans** de service
- **Plafond maximum : 30 jours** par an
- Exemple :
  - 0-4 ans : 18 jours/an
  - 5-9 ans : 19,5 jours/an
  - 10-14 ans : 21 jours/an
  - 15-19 ans : 22,5 jours/an
  - 20+ ans : 24 jours/an (jusqu'au plafond de 30j)

#### **Article 242 : Report des congés non pris**
> *"Le congé annuel peut être fractionné par l'employeur, à la demande du salarié. La fraction du congé non prise doit être reportée à l'année suivante, dans la limite d'un tiers de la durée du congé annuel."*

**Application :**
- **Report limité à 1/3** du droit annuel
- Exemple : Si droit annuel = 18 jours → Report max = 6 jours
- Les jours au-delà de cette limite sont **perdus**
- Délai d'utilisation : **3 mois** après le début de l'année suivante

#### **Article 243 : Conservation des documents**
> *"L'employeur doit conserver pendant cinq ans au moins les documents relatifs aux congés payés."*

**Application :**
- **Conservation minimale : 5 ans**
- Audit trail complet de toutes les modifications
- Sauvegarde automatique des données
- Chiffrement des informations sensibles

---

## 🧮 RÈGLES DE CALCUL

### 1. Calcul du droit annuel

```
Droit Annuel = Base + Bonus d'ancienneté
```

**Où :**
- **Base** = 18 jours (Art. 231)
- **Bonus d'ancienneté** = (Nombre de périodes de 5 ans) × 1,5 jours (Art. 241)
- **Plafond** = 30 jours maximum (Art. 241)

**Exemple :**
```
Employé embauché le 10/03/2010
Au 31/12/2025 : 15 ans de service

Périodes de 5 ans = 15 ÷ 5 = 3
Bonus = 3 × 1,5 = 4,5 jours

Droit annuel 2025 = 18 + 4,5 = 22,5 jours
```

### 2. Calcul du solde disponible

```
Solde Disponible = Droit Annuel + Report N-1 - Jours Utilisés
```

**Exemple :**
```
Droit annuel 2025 : 22,5 jours
Report de 2024 : 5 jours
Jours utilisés en 2025 : 15 jours

Solde disponible = 22,5 + 5 - 15 = 12,5 jours
```

### 3. Calcul du report vers N+1

```
Report N+1 = MIN(Solde Disponible, Limite de Report)
Limite de Report = Droit Annuel × 1/3
```

**Exemple :**
```
Solde disponible : 12,5 jours
Droit annuel 2025 : 22,5 jours
Limite de report : 22,5 × 1/3 = 7,5 jours

Report vers 2026 = MIN(12,5, 7,5) = 7,5 jours
Jours perdus = 12,5 - 7,5 = 5 jours
```

### 4. Calcul au prorata (nouveaux employés)

Pour un employé embauché en cours d'année :

```
Droit Prorata = (Droit Annuel ÷ 12) × Nombre de mois travaillés
```

**Exemple :**
```
Embauché le 01/07/2025
Droit annuel : 18 jours
Mois travaillés en 2025 : 6 mois

Droit 2025 = (18 ÷ 12) × 6 = 9 jours
```

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Base de données

#### Tables principales

1. **`annual_carryovers`** : Reports de solde annuel
   - Stockage des calculs par employé et par année
   - Statuts : DRAFT, PENDING, VALIDATED, LOCKED
   - Validation administrative avec traçabilité

2. **`leave_history`** : Historique complet des congés
   - Enregistrement de tous les congés (dates, types, statuts)
   - Impact sur le solde (avant/après)
   - Année fiscale d'imputation

3. **`carryover_audit`** : Audit trail
   - Traçabilité de toutes les modifications
   - Données avant/après changement
   - Justifications et métadonnées techniques

4. **`carryover_rules`** : Règles de calcul configurables
   - Paramètres par département ou catégorie
   - Règles par défaut conformes à la loi
   - Historisation des changements de règles

#### Vues SQL

- **`v_employee_balances`** : Vue consolidée des soldes
- **`v_pending_carryovers`** : Reports en attente de validation

#### Fonctions SQL

- **`calculate_carryover(user_id, year)`** : Calcul automatique
- **`update_updated_at_column()`** : Mise à jour automatique des timestamps

### Composants React

#### `CarryoverManagement.tsx`
Composant principal d'administration avec :
- Tableau de bord consolidé
- Filtres avancés (année, département, statut)
- Recalcul automatique (individuel ou en masse)
- Validation administrative
- Export CSV
- Modales de détails et validation

#### Utilitaires TypeScript

**`carryoverCalculations.ts`** :
- `calculateYearlyBalance()` : Calcul complet pour une année
- `calculateCurrentBalance()` : Solde actuel
- `calculateProrataAccrual()` : Calcul au prorata
- `validateCarryover()` : Vérification de conformité
- `generateCalculationSummary()` : Génération de rapports

---

## 📖 GUIDE D'UTILISATION

### Pour l'Administrateur

#### 1. Accès au module

```
Menu Admin → Gestion des Reports de Solde
```

#### 2. Visualisation des reports

Le tableau de bord affiche :
- **Employé** : Nom et date d'embauche
- **Département**
- **Jours Acquis** : Droit annuel
- **Jours Utilisés** : Congés pris
- **Solde Restant** : Disponible
- **Report N-1** : Report de l'année précédente
- **Report N+1** : Report vers l'année suivante
- **Jours Perdus** : Au-delà de la limite
- **Statut** : DRAFT / PENDING / VALIDATED / LOCKED

#### 3. Filtres disponibles

- **Année** : Sélectionner l'année fiscale
- **Département** : Filtrer par département
- **Statut** : Filtrer par statut de validation
- **Recherche** : Recherche par nom ou département

#### 4. Recalcul des reports

**Recalcul individuel :**
1. Cliquer sur l'icône 🔄 dans la ligne de l'employé
2. Le système recalcule automatiquement :
   - Droit annuel selon l'ancienneté
   - Jours utilisés dans l'année
   - Report de l'année précédente
   - Nouveau report vers N+1
   - Jours perdus

**Recalcul en masse :**
1. Cliquer sur "Recalculer tout"
2. Confirmer l'opération
3. Le système recalcule tous les employés actifs
4. Notification du résultat (réussis/erreurs)

#### 5. Validation des reports

1. Cliquer sur l'icône ✓ dans la ligne de l'employé
2. Vérifier les informations affichées
3. Ajouter des notes administratives (optionnel)
4. Cliquer sur "Valider le Report"
5. Le statut passe à VALIDATED

**⚠️ Important :** Une fois validé, le report ne peut plus être modifié sans justification dans l'audit trail.

#### 6. Consultation des détails

1. Cliquer sur l'icône 👁️ pour voir les détails complets
2. Affichage :
   - Calculs détaillés
   - Informations de report
   - Références légales
   - Historique des modifications

#### 7. Export des données

1. Appliquer les filtres souhaités
2. Cliquer sur "Exporter CSV"
3. Le fichier contient :
   - Toutes les colonnes du tableau
   - Données filtrées uniquement
   - Format compatible Excel

---

## 🔒 SÉCURITÉ ET CONFORMITÉ

### Sécurité des données

#### Chiffrement
- ✅ Connexion HTTPS obligatoire
- ✅ Données sensibles chiffrées en base
- ✅ Tokens d'authentification sécurisés

#### Contrôle d'accès
- ✅ Row Level Security (RLS) activé
- ✅ Accès réservé aux administrateurs
- ✅ Logs de toutes les actions

#### Audit Trail
Chaque modification enregistre :
- **Qui** : ID de l'utilisateur
- **Quand** : Timestamp précis
- **Quoi** : Action effectuée
- **Pourquoi** : Justification
- **Détails** : Valeurs avant/après
- **Métadonnées** : IP, User-Agent

### Conformité réglementaire

#### Conservation des données (Art. 243)
- **Durée minimale** : 5 ans
- **Sauvegarde automatique** : Quotidienne
- **Archivage** : Format non modifiable
- **Restauration** : Procédure documentée

#### Délais légaux
- **Report** : Utilisable dans les 3 mois (configurable)
- **Validation** : Avant le 31 janvier de l'année N+1
- **Clôture** : Verrouillage après validation finale

#### Traçabilité
- ✅ Historique complet des congés
- ✅ Audit trail de toutes les modifications
- ✅ Justificatifs réglementaires générables
- ✅ Attestations de solde exportables

---

## ❓ FAQ

### Questions fréquentes

#### **Q1 : Que se passe-t-il si un employé a plus de jours que la limite de report ?**
**R :** Les jours excédentaires sont automatiquement marqués comme "perdus" (forfeited_days). Ils apparaissent en orange dans le tableau et sont documentés dans le calcul.

#### **Q2 : Comment gérer un employé qui part en cours d'année ?**
**R :** Le système calcule automatiquement le droit au prorata des mois travaillés. Utilisez la fonction `calculateProrataAccrual()` pour les cas spéciaux.

#### **Q3 : Peut-on modifier un report déjà validé ?**
**R :** Oui, mais cela nécessite une justification obligatoire qui sera enregistrée dans l'audit trail. Le statut repassera à PENDING après modification.

#### **Q4 : Comment gérer les ajustements manuels ?**
**R :** Utilisez le champ `balance_adjustment` dans le profil de l'employé. Cet ajustement sera pris en compte dans tous les calculs futurs.

#### **Q5 : Quelle est la différence entre VALIDATED et LOCKED ?**
**R :** 
- **VALIDATED** : Report validé, peut encore être modifié avec justification
- **LOCKED** : Année clôturée, aucune modification possible (archivage)

#### **Q6 : Comment générer une attestation de solde pour un employé ?**
**R :** Utilisez la fonction `generateCalculationSummary()` qui produit un document formaté avec toutes les informations légales et les références réglementaires.

#### **Q7 : Les jours fériés sont-ils pris en compte ?**
**R :** Oui, le système utilise la liste des jours fériés marocains définie dans `constants.tsx`. Les dimanches et jours fériés sont automatiquement exclus des calculs.

#### **Q8 : Comment vérifier la conformité d'un calcul ?**
**R :** Utilisez la fonction `validateCarryover()` qui effectue 4 vérifications :
1. Report ≤ Limite autorisée
2. Jours utilisés ≤ Disponible
3. Cohérence du solde restant
4. Cohérence des jours perdus

---

## 📊 EXEMPLES DE CAS D'USAGE

### Cas 1 : Employé standard

```
Nom : Ahmed Mansouri
Embauche : 10/03/2020
Ancienneté au 31/12/2025 : 5 ans et 9 mois

Calcul 2025 :
- Droit annuel : 18 + (1 × 1,5) = 19,5 jours
- Report 2024 : 3 jours
- Utilisés en 2025 : 12 jours
- Solde : 19,5 + 3 - 12 = 10,5 jours
- Limite report : 19,5 × 1/3 = 6,5 jours
- Report 2026 : 6,5 jours
- Perdus : 10,5 - 6,5 = 4 jours
```

### Cas 2 : Employé avec forte ancienneté

```
Nom : Fatima El Amrani
Embauche : 15/01/2005
Ancienneté au 31/12/2025 : 20 ans et 11 mois

Calcul 2025 :
- Droit annuel : 18 + (4 × 1,5) = 24 jours
- Report 2024 : 8 jours
- Utilisés en 2025 : 20 jours
- Solde : 24 + 8 - 20 = 12 jours
- Limite report : 24 × 1/3 = 8 jours
- Report 2026 : 8 jours
- Perdus : 12 - 8 = 4 jours
```

### Cas 3 : Nouvel employé (embauche en cours d'année)

```
Nom : Youssef Benali
Embauche : 01/07/2025
Ancienneté au 31/12/2025 : 6 mois

Calcul 2025 :
- Droit annuel : 18 jours
- Droit prorata : (18 ÷ 12) × 6 = 9 jours
- Report 2024 : 0 jour (nouvel employé)
- Utilisés en 2025 : 3 jours
- Solde : 9 + 0 - 3 = 6 jours
- Limite report : 9 × 1/3 = 3 jours
- Report 2026 : 3 jours
- Perdus : 6 - 3 = 3 jours
```

---

## 🚀 DÉPLOIEMENT

### Prérequis

1. **Base de données Supabase** configurée
2. **Tables créées** via `database_annual_carryover.sql`
3. **Permissions RLS** activées
4. **Compte administrateur** créé

### Installation

```bash
# 1. Exécuter le script SQL
psql -h [SUPABASE_HOST] -U postgres -d postgres -f database_annual_carryover.sql

# 2. Vérifier les tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%carryover%';

# 3. Tester la fonction de calcul
SELECT * FROM calculate_carryover('[USER_ID]', 2025);
```

### Configuration

Modifier les règles par défaut si nécessaire :

```sql
UPDATE carryover_rules
SET 
  max_carryover_ratio = 0.5,  -- Exemple : 50% au lieu de 33%
  carryover_expiry_months = 6  -- Exemple : 6 mois au lieu de 3
WHERE is_default = true;
```

---

## 📞 SUPPORT

Pour toute question ou assistance :
- **Documentation** : Ce fichier
- **Code source** : Commenté et documenté
- **Audit trail** : Consultation des logs pour diagnostic
- **Tests** : Fonctions de validation intégrées

---

## 📝 CHANGELOG

### Version 1.0.0 (2026-01-08)
- ✅ Système complet de gestion des reports
- ✅ Conformité Code du Travail Marocain
- ✅ Interface d'administration complète
- ✅ Calculs automatisés et validation
- ✅ Audit trail et sécurité
- ✅ Export et documentation

---

**Document généré le 2026-01-08**  
**Conforme au Code du Travail Marocain - Dahir n° 1-03-194**
