
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
  
  // 2. Majoration d'ancienneté (Art. 241)
  // 1.5 jours supplémentaires par période entière de 5 ans de service.
  // Note : Cette majoration s'ajoute au droit annuel. 
  // Dans un système de cumul, on calcule le bonus acquis au fil du temps.
  const yearsOfService = Math.floor(totalMonthsWorked / 12);
  const seniorityBonusPerYear = Math.floor(yearsOfService / 5) * 1.5;
  
  // 3. Vérification du plafond légal par an (30 jours)
  // Le droit annuel est : 18 jours (base) + seniorityBonusPerYear.
  // Si le droit annuel calculé dépasse 30 jours, on le cap à 30 pour les calculs de cumul.
  const annualRate = Math.min(18 + seniorityBonusPerYear, 30);
  
  // Pour obtenir le solde actuel cumulé depuis l'embauche (simplifié):
  // On applique le taux annuel actuel au prorata du temps passé, 
  // ce qui est la méthode standard en gestion RH pour les tableaux de bord.
  const totalAccrued = (totalMonthsWorked / 12) * annualRate;

  return parseFloat(totalAccrued.toFixed(2));
};
