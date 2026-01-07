
import { MAROC_HOLIDAYS } from '../constants';

/**
 * Calcule le nombre de jours ouvrables entre deux dates au Maroc.
 * Conformément à l'usage, exclut les dimanches et les jours fériés.
 * Le samedi est considéré comme ouvrable.
 */
export const calculateBusinessDays = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Fixed typo: changed iisNaN to isNaN
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start > end) return 0;

  let count = 0;
  const cur = new Date(start);

  while (cur <= end) {
    const dayOfWeek = cur.getDay(); // 0 = Dimanche
    const monthDay = `${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;

    const isHoliday = MAROC_HOLIDAYS.some(h => h.date === monthDay);

    // Dimanche (0) est le repos hebdomadaire légal par défaut (Art 205)
    if (dayOfWeek !== 0 && !isHoliday) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

/**
 * Calcul du solde acquis (Code du Travail Marocain)
 * Art. 231 : 1.5 jours par mois de travail effectif (18 jours par an).
 * Art. 241 : Majoration d'ancienneté (1.5j tous les 5 ans de service).
 * Plafond : Le total des jours de congé annuel ne peut dépasser 30 jours ouvrables par an (Art. 241).
 */
export const calculateMoroccanAccruedDays = (hireDate: string): number => {
  if (!hireDate) return 0;

  const startDate = new Date(hireDate);
  const now = new Date();

  if (isNaN(startDate.getTime())) return 0;

  // Différence précise en années et mois
  let years = now.getFullYear() - startDate.getFullYear();
  let months = now.getMonth() - startDate.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  // Nombre total de mois de travail effectif
  const totalMonthsWorked = (years * 12) + months;

  if (totalMonthsWorked <= 0) return 0;

  // 1. Base : 1.5 jours par mois (Art. 231)
  // Pour un an, cela donne 18 jours.
  const baseAccrual = totalMonthsWorked * 1.5;

  // 2. Calcul du droit annuel selon l'ancienneté
  const yearsOfService = Math.floor(totalMonthsWorked / 12);
  const periodsOf5Years = Math.floor(yearsOfService / 5);

  // Base : 18 jours par an (Art. 231)
  // Majoration d'ancienneté : +1.5 jours par période de 5 ans (Art. 241)
  // Le droit annuel inclut la majoration et est plafonné à 30 jours
  const currentAnnualRate = Math.min(18 + (periodsOf5Years * 1.5), 30);

  // 3. Calcul du solde cumulé depuis l'embauche
  // Pour chaque année complète écoulée, on applique le taux annuel en vigueur à cette époque
  let totalAccrued = 0;
  for (let year = 0; year < yearsOfService; year++) {
    // Calcul du droit annuel pour cette année spécifique
    const periodsAtThatTime = Math.floor(year / 5);
    const annualRateAtThatTime = Math.min(18 + (periodsAtThatTime * 1.5), 30);
    totalAccrued += annualRateAtThatTime;
  }

  // Ajouter les mois restants de l'année en cours avec le taux annuel actuel
  const remainingMonths = totalMonthsWorked % 12;
  totalAccrued += (remainingMonths / 12) * currentAnnualRate;

  return parseFloat(totalAccrued.toFixed(2));
};

/**
 * Analyse détaillée du solde pour les reports
 * Retoure une structure détaillée incluant :
 * - Total acquis historique
 * - Droit Annuel Actuel
 * - Consommé
 * - Restant Total
 * - Report (Solde N-1)
 */
export const calculateBalanceAnalysis = (hireDate: string, consumed: number, adjustment: number = 0) => {
  const totalAccrued = calculateMoroccanAccruedDays(hireDate) + (Number(adjustment) || 0);
  const remaining = Math.max(0, totalAccrued - consumed);

  // Calcul du taux annuel actuel pour déterminer ce qui relève de l'année en cours
  if (!hireDate) return { totalAccrued: 0, currentAnnualRate: 0, consumed: 0, remaining: 0, carryOver: 0 };

  const start = new Date(hireDate);
  const now = new Date();
  const yearsOfService = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const periodsOf5Years = Math.floor(yearsOfService / 5);
  const currentAnnualRate = Math.min(18 + (periodsOf5Years * 1.5), 30);

  // Le report est défini comme tout ce qui excède le droit annuel courant
  // Si j'ai 20 jours et mon droit est 18, j'ai 2 jours de report.
  // Si j'ai 10 jours et mon droit est 18, j'ai 0 jours de report (j'ai tout consommé mon passé et entamé le présent).
  const carryOver = Math.max(0, remaining - currentAnnualRate);

  return {
    totalAccrued,
    currentAnnualRate,
    consumed,
    remaining,
    carryOver
  };
};
