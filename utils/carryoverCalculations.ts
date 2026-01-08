/**
 * ========================================================================
 * CALCULS DE REPORTS DE SOLDE ANNUEL
 * Conforme au Code du Travail Marocain (Dahir n° 1-03-194)
 * ========================================================================
 * 
 * Références légales :
 * - Art. 231 : Droit au congé annuel (1.5 jours/mois = 18 jours/an)
 * - Art. 241 : Majoration d'ancienneté (+1.5j tous les 5 ans, max 30j)
 * - Art. 242 : Report des congés non pris (conditions et limites)
 * - Art. 243 : Conservation des documents (5 ans minimum)
 */

import { CarryoverCalculation, CarryoverRule } from '../types';

/**
 * Règle par défaut conforme au Code du Travail Marocain
 */
export const DEFAULT_CARRYOVER_RULE: CarryoverRule = {
    id: 'default',
    isDefault: true,
    annualBaseDays: 18,           // Art. 231 : 1.5j/mois × 12 = 18j/an
    seniorityBonusDays: 1.5,      // Art. 241 : +1.5j tous les 5 ans
    seniorityBonusYears: 5,
    maxAnnualDays: 30,            // Art. 241 : Plafond légal
    maxCarryoverRatio: 1 / 3,       // Art. 242 : 1/3 du droit annuel
    carryoverExpiryMonths: 3,     // Usage : dans les 3 mois
    effectiveFrom: '2020-01-01',
    legalReference: 'Code du Travail Marocain - Dahir n° 1-03-194',
    notes: 'Règle standard applicable à tous les employés sauf dispositions spécifiques'
};

/**
 * Calcule le nombre d'années de service à une date donnée
 */
export const calculateYearsOfService = (hireDate: string, referenceDate?: string): number => {
    if (!hireDate) return 0;

    const start = new Date(hireDate);
    const end = referenceDate ? new Date(referenceDate) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (start > end) return 0;

    // Calcul précis en années décimales
    const diffMs = end.getTime() - start.getTime();
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);

    return Math.max(0, years);
};

/**
 * Calcule le droit annuel en fonction de l'ancienneté
 * Art. 231 + Art. 241 du Code du Travail Marocain
 */
export const calculateAnnualEntitlement = (
    yearsOfService: number,
    rule: CarryoverRule = DEFAULT_CARRYOVER_RULE
): number => {
    // Base : 18 jours par an (Art. 231)
    let entitlement = rule.annualBaseDays;

    // Majoration d'ancienneté (Art. 241)
    const seniorityPeriods = Math.floor(yearsOfService / rule.seniorityBonusYears);
    const seniorityBonus = seniorityPeriods * rule.seniorityBonusDays;

    entitlement += seniorityBonus;

    // Plafond légal (Art. 241)
    return Math.min(entitlement, rule.maxAnnualDays);
};

/**
 * Calcule le report maximum autorisé (Art. 242)
 * Généralement 1/3 du droit annuel
 */
export const calculateMaxCarryover = (
    annualEntitlement: number,
    rule: CarryoverRule = DEFAULT_CARRYOVER_RULE
): number => {
    return Math.round(annualEntitlement * rule.maxCarryoverRatio * 100) / 100;
};

/**
 * Calcule le solde complet pour une année donnée
 */
export const calculateYearlyBalance = (
    hireDate: string,
    year: number,
    usedDays: number,
    previousCarryover: number = 0,
    usedDaysAdjustment: number = 0,
    rule: CarryoverRule = DEFAULT_CARRYOVER_RULE
): CarryoverCalculation => {
    // Date de référence : 31 décembre de l'année concernée
    const referenceDate = `${year}-12-31`;

    // Calcul de l'ancienneté
    const yearsOfService = calculateYearsOfService(hireDate, referenceDate);

    // Droit annuel selon l'ancienneté
    const annualRate = calculateAnnualEntitlement(yearsOfService, rule);

    // Bonus d'ancienneté
    const seniorityPeriods = Math.floor(yearsOfService / rule.seniorityBonusYears);
    const seniorityBonus = seniorityPeriods * rule.seniorityBonusDays;

    // Total acquis = droit annuel + report N-1
    const totalAvailable = annualRate + previousCarryover;

    // Total consommé réel (calculé + ajustement)
    const totalUsed = usedDays + usedDaysAdjustment;

    // Solde restant
    const remaining = Math.max(0, totalAvailable - totalUsed);

    // Limite de report vers N+1
    const maxCarry = calculateMaxCarryover(annualRate, rule);

    // Report effectif (limité)
    const nextCarry = Math.min(remaining, maxCarry);

    // Jours perdus (au-delà de la limite)
    const forfeited = Math.max(0, remaining - maxCarry);

    return {
        accrued: annualRate,
        used: usedDays,
        remaining,
        previousCarry: previousCarryover,
        nextCarry,
        maxCarry,
        forfeited,
        yearsOfService: Math.round(yearsOfService * 100) / 100,
        annualRate,
        seniorityBonus,
        usedAdjustment: usedDaysAdjustment
    };
};

/**
 * Calcule le solde actuel (année en cours)
 */
export const calculateCurrentBalance = (
    hireDate: string,
    usedDays: number,
    previousCarryover: number = 0,
    balanceAdjustment: number = 0,
    usedDaysAdjustment: number = 0,
    rule: CarryoverRule = DEFAULT_CARRYOVER_RULE
): CarryoverCalculation => {
    const currentYear = new Date().getFullYear();
    const calculation = calculateYearlyBalance(
        hireDate,
        currentYear,
        usedDays,
        previousCarryover,
        usedDaysAdjustment,
        rule
    );

    // Appliquer l'ajustement manuel si présent
    if (balanceAdjustment !== 0) {
        calculation.accrued += balanceAdjustment;
        calculation.remaining = Math.max(0, calculation.accrued + calculation.previousCarry - calculation.used);
        calculation.nextCarry = Math.min(calculation.remaining, calculation.maxCarry);
        calculation.forfeited = Math.max(0, calculation.remaining - calculation.maxCarry);
    }

    return calculation;
};

/**
 * Calcule les jours acquis au prorata pour une période partielle
 * Utile pour les nouveaux employés ou les départs en cours d'année
 */
export const calculateProrataAccrual = (
    hireDate: string,
    startDate: string,
    endDate: string,
    rule: CarryoverRule = DEFAULT_CARRYOVER_RULE
): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const hire = new Date(hireDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || isNaN(hire.getTime())) {
        return 0;
    }

    // Si embauché après la période, aucun droit
    if (hire > end) return 0;

    // Ajuster la date de début si embauché pendant la période
    const effectiveStart = hire > start ? hire : start;

    // Calculer le nombre de mois travaillés de manière plus robuste
    let monthsWorked: number;

    // Si ce sont des dates de début/fin de mois, utiliser une différence simple
    if (effectiveStart.getDate() === 1 && (new Date(end.getTime() + 86400000).getDate() === 1)) {
        monthsWorked = (end.getFullYear() - effectiveStart.getFullYear()) * 12 + (end.getMonth() - effectiveStart.getMonth()) + 1;
    } else {
        const diffMs = end.getTime() - effectiveStart.getTime() + 86400000; // +1 jour pour inclure les deux bornes
        monthsWorked = diffMs / (1000 * 60 * 60 * 24 * 30.4375); // Année / 12
    }

    // Calculer l'ancienneté à la fin de la période
    const yearsOfService = calculateYearsOfService(hireDate, endDate);
    const annualRate = calculateAnnualEntitlement(yearsOfService, rule);

    // Calcul au prorata : (taux annuel / 12) × nombre de mois
    const monthlyRate = annualRate / 12;
    const prorataAccrual = monthlyRate * monthsWorked;

    return Math.round(prorataAccrual * 2) / 2; // Arrondir au 0.5 le plus proche (standard RH)
};

/**
 * Vérifie si un report est conforme à la réglementation
 */
export const validateCarryover = (
    calculation: CarryoverCalculation,
    rule: CarryoverRule = DEFAULT_CARRYOVER_RULE
): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Vérification 1 : Le report ne dépasse pas la limite
    if (calculation.nextCarry > calculation.maxCarry) {
        errors.push(`Le report (${calculation.nextCarry}j) dépasse la limite autorisée (${calculation.maxCarry}j)`);
    }

    // Vérification 2 : Les jours utilisés ne dépassent pas le disponible
    const totalAvailable = calculation.accrued + calculation.previousCarry;
    if (calculation.used > totalAvailable) {
        errors.push(`Jours utilisés (${calculation.used}j) supérieurs au disponible (${totalAvailable}j)`);
    }

    // Vérification 3 : Le solde restant est cohérent
    const expectedRemaining = totalAvailable - calculation.used;
    if (Math.abs(calculation.remaining - expectedRemaining) > 0.01) {
        errors.push(`Incohérence dans le calcul du solde restant`);
    }

    // Vérification 4 : Les jours perdus sont corrects
    const expectedForfeited = Math.max(0, calculation.remaining - calculation.maxCarry);
    if (Math.abs(calculation.forfeited - expectedForfeited) > 0.01) {
        errors.push(`Incohérence dans le calcul des jours perdus`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Génère un résumé textuel du calcul pour documentation
 */
export const generateCalculationSummary = (
    calculation: CarryoverCalculation,
    employeeName: string,
    year: number
): string => {
    const lines = [
        `CALCUL DU SOLDE DE CONGÉS - ${year}`,
        `Employé : ${employeeName}`,
        `Ancienneté : ${calculation.yearsOfService?.toFixed(2)} ans`,
        ``,
        `DROITS :`,
        `- Base annuelle : ${calculation.annualRate} jours`,
        `- Bonus d'ancienneté : ${calculation.seniorityBonus} jours`,
        `- Report N-1 : ${calculation.previousCarry} jours`,
        `- TOTAL DISPONIBLE : ${(calculation.accrued + calculation.previousCarry).toFixed(2)} jours`,
        ``,
        `UTILISATION :`,
        `- Jours consommés : ${calculation.used} jours`,
        `- Solde restant : ${calculation.remaining.toFixed(2)} jours`,
        ``,
        `REPORT VERS ${year + 1} :`,
        `- Limite autorisée : ${calculation.maxCarry} jours (1/3 du droit annuel)`,
        `- Report effectif : ${calculation.nextCarry} jours`,
        `- Jours perdus : ${calculation.forfeited} jours`,
        ``,
        `Conforme au Code du Travail Marocain (Art. 231, 241, 242)`
    ];

    return lines.join('\n');
};

/**
 * Calcule l'historique complet des soldes sur plusieurs années
 */
export const calculateMultiYearHistory = (
    hireDate: string,
    yearlyUsage: { year: number; used: number }[],
    rule: CarryoverRule = DEFAULT_CARRYOVER_RULE
): CarryoverCalculation[] => {
    const history: CarryoverCalculation[] = [];
    let previousCarry = 0;

    // Trier par année
    const sortedUsage = [...yearlyUsage].sort((a, b) => a.year - b.year);

    for (const { year, used } of sortedUsage) {
        const calculation = calculateYearlyBalance(
            hireDate,
            year,
            used,
            previousCarry,
            0, // usedDaysAdjustment
            rule
        );

        history.push(calculation);
        previousCarry = calculation.nextCarry;
    }

    return history;
};

/**
 * Estime la date d'expiration du report (Art. 242)
 * Les jours reportés doivent généralement être utilisés dans les 3 mois
 */
export const calculateCarryoverExpiryDate = (
    year: number,
    rule: CarryoverRule = DEFAULT_CARRYOVER_RULE
): Date => {
    const expiryDate = new Date(year + 1, 0, 1); // 1er janvier N+1
    expiryDate.setMonth(expiryDate.getMonth() + rule.carryoverExpiryMonths);
    return expiryDate;
};

/**
 * Vérifie si un report a expiré
 */
export const isCarryoverExpired = (
    year: number,
    currentDate: Date = new Date(),
    rule: CarryoverRule = DEFAULT_CARRYOVER_RULE
): boolean => {
    const expiryDate = calculateCarryoverExpiryDate(year, rule);
    return currentDate > expiryDate;
};
