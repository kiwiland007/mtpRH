
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
    comment: ''
  });
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const days = calculateBusinessDays(formData.startDate, formData.endDate);
      setDuration(days);
    }
  }, [formData.startDate, formData.endDate]);

  const showNotification = (message: string) => {
    if (onNotification) {
      onNotification(message);
    } else {
      alert(message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des dates
    if (!formData.startDate || !formData.endDate) {
      showNotification('Veuillez sélectionner les dates de début et de fin');
      return;
    }
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      showNotification('Dates invalides');
      return;
    }
    
    if (start > end) {
      showNotification('La date de début doit être antérieure à la date de fin');
      return;
    }
    
    if (duration <= 0) {
      showNotification('Dates invalides ou ne contenant aucun jour ouvrable');
      return;
    }
    
    // Vérifier que la date de début n'est pas dans le passé
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      if (!window.confirm('La date de début est dans le passé. Souhaitez-vous continuer ?')) {
        return;
      }
    }
    
    onSubmit({ ...formData, duration });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white relative">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold">Soumettre une absence</h2>
            <p className="text-slate-400 mt-2">Votre demande sera envoyée à votre manager pour approbation.</p>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 19H5V8h14m-3-7v2H8V1m-3 2v2H2v16h20V5h-3V3"/></svg>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Motif de l'absence</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as LeaveType})}
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value={LeaveType.ANNUAL}>🏖️ Congé Annuel</option>
                <option value={LeaveType.EXCEPTIONAL}>🎉 Évènement familial</option>
                <option value={LeaveType.SICK}>🤒 Maladie</option>
                <option value={LeaveType.RTT}>🕒 RTT / Récupération</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Durée calculée</label>
              <div className="bg-emerald-50 text-emerald-700 py-3 px-4 rounded-2xl font-bold text-center border border-emerald-100">
                {duration} jours ouvrables
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Du (Inclus)</label>
              <input 
                type="date" 
                required
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Au (Inclus)</label>
              <input 
                type="date" 
                required
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Note ou commentaire</label>
            <textarea 
              rows={3}
              value={formData.comment}
              onChange={(e) => setFormData({...formData, comment: e.target.value})}
              placeholder="Informations complémentaires pour votre manager..."
              className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-4">
             <button 
               type="button" 
               onClick={() => {
                 setFormData({ type: LeaveType.ANNUAL, startDate: '', endDate: '', comment: '' });
                 setDuration(0);
               }}
               className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
             >
               Annuler
             </button>
             <button type="submit" className="bg-emerald-600 text-white px-10 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95">
               Envoyer la demande
             </button>
          </div>
        </form>
      </div>
      
      <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex gap-4">
        <div className="text-2xl">💡</div>
        <p className="text-sm text-amber-800 leading-relaxed">
          <strong>Rappel réglementaire :</strong> Selon l'Art. 245, l'employeur doit fixer la date du congé après consultation des délégués des salariés. Veillez à soumettre votre demande au moins 15 jours à l'avance.
        </p>
      </div>
    </div>
  );
};

export default LeaveForm;
