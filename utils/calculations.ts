
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
 * Art. 231 : 1.5 jours par mois de travail effectif.
 * Art. 241 : Majoration d'ancienneté (1.5j tous les 5 ans, plafonné à 30j au total par an sauf exception).
 */
export const calculateMoroccanAccruedDays = (hireDate: string): number => {
  if (!hireDate) return 0;
  
  const start = new Date(hireDate);
  const now = new Date();
  
  if (isNaN(start.getTime())) return 0;

  // Calcul du nombre de mois travaillés
  let months = (now.getFullYear() - start.getFullYear()) * 12;
  months += now.getMonth() - start.getMonth();
  
  if (months <= 0) return 0;
  
  const yearsOfService = Math.floor(months / 12);
  
  // 1.5 jours par mois
  const baseAccrual = months * 1.5;
  
  // Bonus d'ancienneté : +1.5 jours tous les 5 ans d'ancienneté
  // Un salarié avec 10 ans d'ancienneté a +3 jours bonus sur son solde global
  const seniorityBonus = Math.floor(yearsOfService / 5) * 1.5;
  
  return baseAccrual + seniorityBonus;
};
