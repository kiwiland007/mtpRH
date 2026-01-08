/**
 * TESTS UNITAIRES - CALCULS DE REPORTS DE SOLDE
 * Validation de la conformité au Code du Travail Marocain
 */

import {
    calculateYearsOfService,
    calculateAnnualEntitlement,
    calculateMaxCarryover,
    calculateYearlyBalance,
    calculateProrataAccrual,
    validateCarryover,
    DEFAULT_CARRYOVER_RULE
} from '../utils/carryoverCalculations';

// Couleurs pour l'affichage console
const COLORS = {
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    RESET: '\x1b[0m'
};

interface TestCase {
    name: string;
    input: any;
    expected: any;
    testFn: (input: any) => any;
}

let passedTests = 0;
let failedTests = 0;

function runTest(testCase: TestCase) {
    try {
        const result = testCase.testFn(testCase.input);
        const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);

        if (passed) {
            console.log(`${COLORS.GREEN}✓${COLORS.RESET} ${testCase.name}`);
            passedTests++;
        } else {
            console.log(`${COLORS.RED}✗${COLORS.RESET} ${testCase.name}`);
            console.log(`  Expected:`, testCase.expected);
            console.log(`  Got:`, result);
            failedTests++;
        }
    } catch (error) {
        console.log(`${COLORS.RED}✗${COLORS.RESET} ${testCase.name} - Error: ${error}`);
        failedTests++;
    }
}

console.log(`\n${COLORS.BLUE}═══════════════════════════════════════════════════════${COLORS.RESET}`);
console.log(`${COLORS.BLUE}  TESTS - GESTION DES REPORTS DE SOLDE ANNUEL${COLORS.RESET}`);
console.log(`${COLORS.BLUE}  Conformité Code du Travail Marocain${COLORS.RESET}`);
console.log(`${COLORS.BLUE}═══════════════════════════════════════════════════════${COLORS.RESET}\n`);

// ============================================================================
// TEST 1 : CALCUL DE L'ANCIENNETÉ
// ============================================================================
console.log(`${COLORS.YELLOW}📅 Test 1 : Calcul de l'ancienneté${COLORS.RESET}\n`);

runTest({
    name: 'Ancienneté - 5 ans exactement',
    input: { hireDate: '2020-01-01', referenceDate: '2025-01-01' },
    expected: 5,
    testFn: (input) => Math.floor(calculateYearsOfService(input.hireDate, input.referenceDate))
});

runTest({
    name: 'Ancienneté - 10 ans et 6 mois',
    input: { hireDate: '2015-06-15', referenceDate: '2025-12-31' },
    expected: 10,
    testFn: (input) => Math.floor(calculateYearsOfService(input.hireDate, input.referenceDate))
});

runTest({
    name: 'Ancienneté - Moins d\'un an',
    input: { hireDate: '2025-07-01', referenceDate: '2025-12-31' },
    expected: 0,
    testFn: (input) => Math.floor(calculateYearsOfService(input.hireDate, input.referenceDate))
});

// ============================================================================
// TEST 2 : CALCUL DU DROIT ANNUEL (Art. 231 + 241)
// ============================================================================
console.log(`\n${COLORS.YELLOW}📊 Test 2 : Calcul du droit annuel${COLORS.RESET}\n`);

runTest({
    name: 'Droit annuel - Moins de 5 ans (base)',
    input: 3,
    expected: 18,
    testFn: (years) => calculateAnnualEntitlement(years)
});

runTest({
    name: 'Droit annuel - 5 ans (première majoration)',
    input: 5,
    expected: 19.5,
    testFn: (years) => calculateAnnualEntitlement(years)
});

runTest({
    name: 'Droit annuel - 10 ans (deuxième majoration)',
    input: 10,
    expected: 21,
    testFn: (years) => calculateAnnualEntitlement(years)
});

runTest({
    name: 'Droit annuel - 15 ans (troisième majoration)',
    input: 15,
    expected: 22.5,
    testFn: (years) => calculateAnnualEntitlement(years)
});

runTest({
    name: 'Droit annuel - 20 ans (quatrième majoration)',
    input: 20,
    expected: 24,
    testFn: (years) => calculateAnnualEntitlement(years)
});

runTest({
    name: 'Droit annuel - 40 ans (plafond à 30j)',
    input: 40,
    expected: 30,
    testFn: (years) => calculateAnnualEntitlement(years)
});

// ============================================================================
// TEST 3 : CALCUL DE LA LIMITE DE REPORT (Art. 242)
// ============================================================================
console.log(`\n${COLORS.YELLOW}🔒 Test 3 : Limite de report (1/3 du droit annuel)${COLORS.RESET}\n`);

runTest({
    name: 'Limite report - 18 jours annuels',
    input: 18,
    expected: 6,
    testFn: (annual) => calculateMaxCarryover(annual)
});

runTest({
    name: 'Limite report - 19.5 jours annuels',
    input: 19.5,
    expected: 6.5,
    testFn: (annual) => calculateMaxCarryover(annual)
});

runTest({
    name: 'Limite report - 30 jours annuels (plafond)',
    input: 30,
    expected: 10,
    testFn: (annual) => calculateMaxCarryover(annual)
});

// ============================================================================
// TEST 4 : CALCUL COMPLET DU SOLDE ANNUEL
// ============================================================================
console.log(`\n${COLORS.YELLOW}💰 Test 4 : Calcul complet du solde annuel${COLORS.RESET}\n`);

// Cas 1 : Employé standard, 3 ans d'ancienneté
runTest({
    name: 'Solde complet - Employé 3 ans, 10j utilisés, 0 report',
    input: { hireDate: '2022-01-01', year: 2025, used: 10, prevCarry: 0 },
    expected: {
        accrued: 18,
        used: 10,
        remaining: 8,
        previousCarry: 0,
        nextCarry: 6,
        maxCarry: 6,
        forfeited: 2
    },
    testFn: (input) => {
        const result = calculateYearlyBalance(input.hireDate, input.year, input.used, input.prevCarry);
        return {
            accrued: result.accrued,
            used: result.used,
            remaining: result.remaining,
            previousCarry: result.previousCarry,
            nextCarry: result.nextCarry,
            maxCarry: result.maxCarry,
            forfeited: result.forfeited
        };
    }
});

// Cas 2 : Employé avec ancienneté, report de l'année précédente
runTest({
    name: 'Solde complet - Employé 10 ans, 15j utilisés, 5j report',
    input: { hireDate: '2015-01-01', year: 2025, used: 15, prevCarry: 5 },
    expected: {
        accrued: 21,
        used: 15,
        remaining: 11,
        previousCarry: 5,
        nextCarry: 7,
        maxCarry: 7,
        forfeited: 4
    },
    testFn: (input) => {
        const result = calculateYearlyBalance(input.hireDate, input.year, input.used, input.prevCarry);
        return {
            accrued: result.accrued,
            used: result.used,
            remaining: result.remaining,
            previousCarry: result.previousCarry,
            nextCarry: result.nextCarry,
            maxCarry: result.maxCarry,
            forfeited: result.forfeited
        };
    }
});

// Cas 3 : Employé qui a tout utilisé
runTest({
    name: 'Solde complet - Employé 5 ans, tout utilisé',
    input: { hireDate: '2020-01-01', year: 2025, used: 22, prevCarry: 2.5 },
    expected: {
        accrued: 19.5,
        used: 22,
        remaining: 0,
        previousCarry: 2.5,
        nextCarry: 0,
        maxCarry: 6.5,
        forfeited: 0
    },
    testFn: (input) => {
        const result = calculateYearlyBalance(input.hireDate, input.year, input.used, input.prevCarry);
        return {
            accrued: result.accrued,
            used: result.used,
            remaining: result.remaining,
            previousCarry: result.previousCarry,
            nextCarry: result.nextCarry,
            maxCarry: result.maxCarry,
            forfeited: result.forfeited
        };
    }
});

// ============================================================================
// TEST 5 : CALCUL AU PRORATA (nouveaux employés)
// ============================================================================
console.log(`\n${COLORS.YELLOW}📐 Test 5 : Calcul au prorata${COLORS.RESET}\n`);

runTest({
    name: 'Prorata - 6 mois travaillés (mi-année)',
    input: { hireDate: '2025-07-01', start: '2025-07-01', end: '2025-12-31' },
    expected: 9,
    testFn: (input) => calculateProrataAccrual(input.hireDate, input.start, input.end)
});

runTest({
    name: 'Prorata - 3 mois travaillés',
    input: { hireDate: '2025-10-01', start: '2025-10-01', end: '2025-12-31' },
    expected: 4.5,
    testFn: (input) => Math.round(calculateProrataAccrual(input.hireDate, input.start, input.end) * 10) / 10
});

runTest({
    name: 'Prorata - Année complète',
    input: { hireDate: '2024-01-01', start: '2025-01-01', end: '2025-12-31' },
    expected: 18,
    testFn: (input) => Math.round(calculateProrataAccrual(input.hireDate, input.start, input.end))
});

// ============================================================================
// TEST 6 : VALIDATION DE CONFORMITÉ
// ============================================================================
console.log(`\n${COLORS.YELLOW}✅ Test 6 : Validation de conformité${COLORS.RESET}\n`);

// Cas valide
runTest({
    name: 'Validation - Calcul conforme',
    input: {
        accrued: 18,
        used: 10,
        remaining: 8,
        previousCarry: 0,
        nextCarry: 6,
        maxCarry: 6,
        forfeited: 2
    },
    expected: true,
    testFn: (calc) => validateCarryover(calc).isValid
});

// Cas invalide : report dépasse la limite
runTest({
    name: 'Validation - Report dépasse la limite (invalide)',
    input: {
        accrued: 18,
        used: 5,
        remaining: 13,
        previousCarry: 0,
        nextCarry: 10, // Dépasse maxCarry
        maxCarry: 6,
        forfeited: 0
    },
    expected: false,
    testFn: (calc) => validateCarryover(calc).isValid
});

// Cas invalide : jours utilisés > disponible
runTest({
    name: 'Validation - Jours utilisés > disponible (invalide)',
    input: {
        accrued: 18,
        used: 25, // Plus que disponible
        remaining: 0,
        previousCarry: 5,
        nextCarry: 0,
        maxCarry: 6,
        forfeited: 0
    },
    expected: false,
    testFn: (calc) => validateCarryover(calc).isValid
});

// ============================================================================
// TEST 7 : CAS RÉELS D'USAGE
// ============================================================================
console.log(`\n${COLORS.YELLOW}🎯 Test 7 : Cas réels d'usage${COLORS.RESET}\n`);

// Ahmed Mansouri - Cas de la documentation
runTest({
    name: 'Cas réel - Ahmed Mansouri (5 ans, 12j utilisés, 3j report)',
    input: { hireDate: '2020-03-10', year: 2025, used: 12, prevCarry: 3 },
    expected: {
        accrued: 19.5,
        nextCarry: 6.5,
        forfeited: 4
    },
    testFn: (input) => {
        const result = calculateYearlyBalance(input.hireDate, input.year, input.used, input.prevCarry);
        return {
            accrued: result.accrued,
            nextCarry: result.nextCarry,
            forfeited: result.forfeited
        };
    }
});

// Fatima El Amrani - Forte ancienneté
runTest({
    name: 'Cas réel - Fatima El Amrani (20 ans, 20j utilisés, 8j report)',
    input: { hireDate: '2005-01-15', year: 2025, used: 20, prevCarry: 8 },
    expected: {
        accrued: 24,
        nextCarry: 8,
        forfeited: 4
    },
    testFn: (input) => {
        const result = calculateYearlyBalance(input.hireDate, input.year, input.used, input.prevCarry);
        return {
            accrued: result.accrued,
            nextCarry: result.nextCarry,
            forfeited: result.forfeited
        };
    }
});

// Youssef Benali - Nouvel employé
runTest({
    name: 'Cas réel - Youssef Benali (6 mois, 3j utilisés)',
    input: { hireDate: '2025-07-01', start: '2025-07-01', end: '2025-12-31' },
    expected: 9,
    testFn: (input) => Math.round(calculateProrataAccrual(input.hireDate, input.start, input.end))
});

// ============================================================================
// RÉSULTATS FINAUX
// ============================================================================
console.log(`\n${COLORS.BLUE}═══════════════════════════════════════════════════════${COLORS.RESET}`);
console.log(`${COLORS.BLUE}  RÉSULTATS DES TESTS${COLORS.RESET}`);
console.log(`${COLORS.BLUE}═══════════════════════════════════════════════════════${COLORS.RESET}\n`);

const totalTests = passedTests + failedTests;
const successRate = ((passedTests / totalTests) * 100).toFixed(1);

console.log(`Total de tests : ${totalTests}`);
console.log(`${COLORS.GREEN}✓ Réussis : ${passedTests}${COLORS.RESET}`);
console.log(`${COLORS.RED}✗ Échoués : ${failedTests}${COLORS.RESET}`);
console.log(`Taux de réussite : ${successRate}%\n`);

if (failedTests === 0) {
    console.log(`${COLORS.GREEN}🎉 TOUS LES TESTS SONT PASSÉS !${COLORS.RESET}`);
    console.log(`${COLORS.GREEN}✅ Le système est conforme au Code du Travail Marocain${COLORS.RESET}\n`);
} else {
    console.log(`${COLORS.RED}⚠️  CERTAINS TESTS ONT ÉCHOUÉ${COLORS.RESET}`);
    console.log(`${COLORS.RED}❌ Vérifier les calculs avant déploiement${COLORS.RESET}\n`);
}

// Export pour utilisation dans d'autres tests
export { passedTests, failedTests };
