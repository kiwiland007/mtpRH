/**
 * ========================================================================
 * CONFIGURATION DES RÈGLES DE CALCUL DES REPORTS
 * ========================================================================
 * 
 * Ce fichier permet de personnaliser les règles de calcul selon les besoins
 * de l'entreprise, tout en restant conforme au Code du Travail Marocain.
 * 
 * ⚠️ IMPORTANT : Toute modification doit respecter les minimums légaux !
 */

import { CarryoverRule } from '../types';

/**
 * ========================================================================
 * RÈGLE PAR DÉFAUT - CODE DU TRAVAIL MAROCAIN
 * ========================================================================
 * Conforme au Dahir n° 1-03-194 (Art. 231, 241, 242)
 */
export const MOROCCAN_LABOR_LAW_RULE: CarryoverRule = {
    id: 'moroccan-labor-law',
    isDefault: true,

    // Droit annuel de base (Art. 231)
    annualBaseDays: 18,           // 1.5j/mois × 12 = 18j/an

    // Majoration d'ancienneté (Art. 241)
    seniorityBonusDays: 1.5,      // +1.5j tous les 5 ans
    seniorityBonusYears: 5,       // Période de 5 ans
    maxAnnualDays: 30,            // Plafond légal

    // Règles de report (Art. 242)
    maxCarryoverRatio: 1 / 3,       // 33.33% du droit annuel
    carryoverExpiryMonths: 3,     // Utilisation dans les 3 mois

    // Métadonnées
    effectiveFrom: '2020-01-01',
    legalReference: 'Code du Travail Marocain - Dahir n° 1-03-194',
    notes: 'Règle standard applicable à tous les employés sauf dispositions spécifiques'
};

/**
 * ========================================================================
 * RÈGLE PERSONNALISÉE - CADRES SUPÉRIEURS
 * ========================================================================
 * Exemple : Conditions plus avantageuses pour les cadres
 * (Doit rester conforme aux minimums légaux)
 */
export const SENIOR_MANAGEMENT_RULE: CarryoverRule = {
    id: 'senior-management',
    isDefault: false,
    role: 'MANAGER',

    // Droit annuel amélioré
    annualBaseDays: 22,           // Base améliorée (> 18j légal)

    // Majoration d'ancienneté identique
    seniorityBonusDays: 1.5,
    seniorityBonusYears: 5,
    maxAnnualDays: 30,            // Plafond légal inchangé

    // Report plus généreux
    maxCarryoverRatio: 0.5,       // 50% au lieu de 33%
    carryoverExpiryMonths: 6,     // 6 mois au lieu de 3

    // Métadonnées
    effectiveFrom: '2025-01-01',
    legalReference: 'Accord d\'entreprise - Cadres supérieurs',
    notes: 'Conditions améliorées pour les managers, conformes aux minimums légaux'
};

/**
 * ========================================================================
 * RÈGLE PERSONNALISÉE - DÉPARTEMENT TECHNIQUE
 * ========================================================================
 * Exemple : Conditions spécifiques pour un département
 */
export const IT_DEPARTMENT_RULE: CarryoverRule = {
    id: 'it-department',
    isDefault: false,
    department: 'IT',

    // Droit annuel standard
    annualBaseDays: 18,

    // Majoration d'ancienneté accélérée
    seniorityBonusDays: 2,        // +2j au lieu de 1.5j
    seniorityBonusYears: 4,       // Tous les 4 ans au lieu de 5
    maxAnnualDays: 30,

    // Report standard
    maxCarryoverRatio: 1 / 3,
    carryoverExpiryMonths: 3,

    // Métadonnées
    effectiveFrom: '2025-01-01',
    effectiveUntil: '2026-12-31',  // Règle temporaire
    legalReference: 'Accord d\'entreprise - Département IT',
    notes: 'Majoration accélérée pour retenir les talents techniques'
};

/**
 * ========================================================================
 * RÈGLE PERSONNALISÉE - NOUVEAUX EMPLOYÉS
 * ========================================================================
 * Exemple : Période d'essai ou première année
 */
export const NEW_EMPLOYEE_RULE: CarryoverRule = {
    id: 'new-employee',
    isDefault: false,

    // Droit annuel au prorata (calculé automatiquement)
    annualBaseDays: 18,

    // Pas de majoration la première année
    seniorityBonusDays: 0,
    seniorityBonusYears: 5,
    maxAnnualDays: 18,            // Pas de bonus la première année

    // Pas de report la première année
    maxCarryoverRatio: 0,         // Aucun report autorisé
    carryoverExpiryMonths: 0,

    // Métadonnées
    effectiveFrom: '2025-01-01',
    legalReference: 'Politique RH - Nouveaux employés',
    notes: 'Applicable uniquement la première année d\'embauche'
};

/**
 * ========================================================================
 * FONCTION DE SÉLECTION DE LA RÈGLE APPLICABLE
 * ========================================================================
 */
export const getApplicableRule = (
    employee: {
        role?: string;
        department?: string;
        hireDate: string;
    }
): CarryoverRule => {
    const yearsOfService = calculateYearsOfService(employee.hireDate);

    // Règle 1 : Nouveaux employés (première année)
    if (yearsOfService < 1) {
        return NEW_EMPLOYEE_RULE;
    }

    // Règle 2 : Département IT
    if (employee.department === 'IT') {
        return IT_DEPARTMENT_RULE;
    }

    // Règle 3 : Cadres supérieurs
    if (employee.role === 'MANAGER' || employee.role === 'ADMIN') {
        return SENIOR_MANAGEMENT_RULE;
    }

    // Règle par défaut : Code du Travail Marocain
    return MOROCCAN_LABOR_LAW_RULE;
};

/**
 * Calcul simple de l'ancienneté
 */
function calculateYearsOfService(hireDate: string): number {
    const start = new Date(hireDate);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * ========================================================================
 * VALIDATION DES RÈGLES PERSONNALISÉES
 * ========================================================================
 * Vérifie qu'une règle respecte les minimums légaux
 */
export const validateCustomRule = (rule: CarryoverRule): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
} => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérification 1 : Droit annuel minimum (18j selon Art. 231)
    if (rule.annualBaseDays < 18) {
        errors.push(`Le droit annuel de base (${rule.annualBaseDays}j) est inférieur au minimum légal (18j)`);
    }

    // Vérification 2 : Majoration d'ancienneté
    if (rule.seniorityBonusDays < 0) {
        errors.push('La majoration d\'ancienneté ne peut pas être négative');
    }

    if (rule.seniorityBonusDays < 1.5) {
        warnings.push(`La majoration (${rule.seniorityBonusDays}j) est inférieure au standard légal (1.5j)`);
    }

    // Vérification 3 : Plafond maximum
    if (rule.maxAnnualDays > 30) {
        warnings.push(`Le plafond (${rule.maxAnnualDays}j) dépasse le standard légal (30j)`);
    }

    // Vérification 4 : Ratio de report
    if (rule.maxCarryoverRatio < 0 || rule.maxCarryoverRatio > 1) {
        errors.push(`Le ratio de report (${rule.maxCarryoverRatio}) doit être entre 0 et 1`);
    }

    if (rule.maxCarryoverRatio < 1 / 3) {
        warnings.push(`Le ratio de report (${(rule.maxCarryoverRatio * 100).toFixed(0)}%) est inférieur au standard (33%)`);
    }

    // Vérification 5 : Délai d'expiration
    if (rule.carryoverExpiryMonths < 0) {
        errors.push('Le délai d\'expiration ne peut pas être négatif');
    }

    if (rule.carryoverExpiryMonths < 3) {
        warnings.push(`Le délai d'expiration (${rule.carryoverExpiryMonths} mois) est inférieur au standard (3 mois)`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * ========================================================================
 * EXPORT DES RÈGLES DISPONIBLES
 * ========================================================================
 */
export const AVAILABLE_RULES: CarryoverRule[] = [
    MOROCCAN_LABOR_LAW_RULE,
    SENIOR_MANAGEMENT_RULE,
    IT_DEPARTMENT_RULE,
    NEW_EMPLOYEE_RULE
];

/**
 * ========================================================================
 * FONCTION D'AIDE POUR CRÉER UNE RÈGLE PERSONNALISÉE
 * ========================================================================
 */
export const createCustomRule = (
    baseRule: CarryoverRule = MOROCCAN_LABOR_LAW_RULE,
    overrides: Partial<CarryoverRule>
): CarryoverRule => {
    const customRule = {
        ...baseRule,
        ...overrides,
        id: overrides.id || `custom-${Date.now()}`,
        isDefault: false
    };

    // Valider la règle personnalisée
    const validation = validateCustomRule(customRule);

    if (!validation.isValid) {
        throw new Error(`Règle invalide : ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
        console.warn('Avertissements pour la règle personnalisée :', validation.warnings);
    }

    return customRule;
};

/**
 * ========================================================================
 * EXEMPLES D'UTILISATION
 * ========================================================================
 */

// Exemple 1 : Utiliser la règle par défaut
// const rule = MOROCCAN_LABOR_LAW_RULE;

// Exemple 2 : Sélectionner automatiquement la règle applicable
// const rule = getApplicableRule({
//   role: 'MANAGER',
//   department: 'Direction',
//   hireDate: '2020-03-10'
// });

// Exemple 3 : Créer une règle personnalisée
// const customRule = createCustomRule(MOROCCAN_LABOR_LAW_RULE, {
//   id: 'sales-team',
//   department: 'Commercial',
//   annualBaseDays: 20,
//   maxCarryoverRatio: 0.4,
//   notes: 'Conditions spéciales pour l\'équipe commerciale'
// });

// Exemple 4 : Valider une règle avant utilisation
// const validation = validateCustomRule(customRule);
// if (!validation.isValid) {
//   console.error('Erreurs:', validation.errors);
// }
