
import React, { useState, useEffect } from 'react';
import { LeaveType } from '../types';
import { calculateBusinessDays } from '../utils/calculations';

interface LeaveFormProps {
  onSubmit: (data: any) => void;
  onNotification?: (message: string) => void;
}

const LeaveForm: React.FC<LeaveFormProps> = ({ onSubmit, onNotification }) => {
  const [formData, setFormData] = useState({
    type: LeaveType.ANNUAL,
    startDate: '',
    endDate: '',
    comment: '',
    isHalfDay: false
  });
  const [duration, setDuration] = useState<number | string>(0);

  useEffect(() => {
    if (formData.startDate && formData.endDate && !formData.isHalfDay) {
      const days = calculateBusinessDays(formData.startDate, formData.endDate);
      setDuration(days);
    } else if (formData.isHalfDay && formData.startDate) {
      setDuration(0.5);
      setFormData(prev => ({ ...prev, endDate: prev.startDate }));
    }
  }, [formData.startDate, formData.endDate, formData.isHalfDay]);

  const showNotification = (message: string) => {
    if (onNotification) {
      onNotification(message);
    } else {
      alert(message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericDuration = Number(duration);

    // Validation des données
    if (!formData.startDate) {
      showNotification('Veuillez sélectionner une date de début');
      return;
    }

    if (!formData.isHalfDay && !formData.endDate) {
      showNotification('Veuillez sélectionner une date de fin');
      return;
    }

    if (!duration || numericDuration <= 0) {
      showNotification('Le nombre de jours doit être une valeur positive');
      return;
    }

    const start = new Date(formData.startDate);
    const end = formData.isHalfDay ? start : new Date(formData.endDate);

    if (isNaN(start.getTime()) || (!formData.isHalfDay && isNaN(end.getTime()))) {
      showNotification('Dates invalides');
      return;
    }

    if (!formData.isHalfDay && start > end) {
      showNotification('La date de début doit être antérieure à la date de fin');
      return;
    }

    // Vérifier que la date de début n'est pas dans le passé (Attention: simple avertissement)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      if (!window.confirm('La date de début est dans le passé. Souhaitez-vous continuer ?')) {
        return;
      }
    }

    onSubmit({
      ...formData,
      endDate: formData.isHalfDay ? formData.startDate : formData.endDate,
      duration: numericDuration
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="bg-slate-900 p-10 text-white relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tighter">Soumettre une absence</h2>
            <p className="text-slate-400 mt-2 font-medium">Votre demande sera envoyée à votre manager pour approbation.</p>
          </div>
          <div className="absolute top-0 right-0 p-10 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 19H5V8h14m-3-7v2H8V1m-3 2v2H2v16h20V5h-3V3" /></svg>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Motif de l'absence</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as LeaveType })}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
              >
                <option value={LeaveType.ANNUAL}>🏖️ Congé Annuel</option>
                <option value={LeaveType.EXCEPTIONAL}>🎉 Évènement familial</option>
                <option value={LeaveType.SICK}>🤒 Maladie</option>
                <option value={LeaveType.RTT}>🕒 RTT / Récupération</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex justify-between items-center group relative">
                Nombre de jours
                <span className="cursor-help opacity-40 hover:opacity-100 transition-opacity">ℹ️
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg hidden group-hover:block normal-case font-medium">
                    Valeur positive obligatoire (ex: 1, 2.5, 0.5)
                  </span>
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Ex: 1.5"
                  className="w-full bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-2xl py-4 px-5 text-sm font-black focus:border-emerald-500 outline-none transition-all"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600 uppercase">Jours</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-slate-600">Demande de demi-journée</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isHalfDay}
                  onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 font-black"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Du (Inclus)</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              {!formData.isHalfDay && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Au (Inclus)</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              )}
              {formData.isHalfDay && (
                <div className="flex items-center justify-center bg-white border-2 border-slate-100 rounded-2xl p-4 opacity-50">
                  <span className="text-xs font-bold text-slate-400">Demi-journée (Date unique)</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Note ou commentaire</label>
            <textarea
              rows={3}
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Ex: Urgence familiale, rendez-vous médical à 14h..."
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-medium focus:border-emerald-500 outline-none transition-all resize-none"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => {
                setFormData({ type: LeaveType.ANNUAL, startDate: '', endDate: '', comment: '', isHalfDay: false });
                setDuration(0);
              }}
              className="px-8 py-4 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all text-sm"
            >
              Annuler
            </button>
            <button type="submit" className="bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 hover:bg-black transition-all active:scale-95 flex items-center gap-2">
              Envoyer la demande ✨
            </button>
          </div>
        </form>
      </div>

      <div className="bg-amber-50 border-2 border-amber-100 p-8 rounded-[2rem] flex gap-5">
        <div className="text-3xl">💡</div>
        <div className="space-y-1">
          <p className="text-xs font-black text-amber-900 uppercase tracking-wider">Règle de calcul</p>
          <p className="text-sm text-amber-800 leading-relaxed font-medium">
            Le système déduit automatiquement les dimanches et jours fériés nationaux. Pour une demi-journée, cochez l'option dédiée : elle sera comptée comme <strong>0,5 jour</strong> dans votre solde.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeaveForm;
