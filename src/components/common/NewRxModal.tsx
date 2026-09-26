import React, { useState } from 'react';

interface NewRxModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  onSuccess: (msg: string) => void;
}

export const NewRxModal: React.FC<NewRxModalProps> = ({ isOpen, onClose, patient, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    medicationName: '',
    dosage: '',
    frequency: 'STAT',
    route: 'IV',
    urgency: 'Routine',
    narcoticVault: false
  });

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token') || 'mock-token';
      const payload = {
        uhid: patient.uhid,
        patientName: patient.name,
        bed: patient.bedId || patient.bed || 'Unknown',
        ward: patient.ward || 'General Ward',
        ...formData
      };

      const res = await fetch('/api/pharmacy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to prescribe medication');
      }

      onSuccess(`Prescribed ${formData.medicationName} (${formData.dosage}) to ${patient.name}`);
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-blue-50">
          <div className="flex items-center gap-2 text-blue-900">
            <span className="material-symbols-outlined text-[20px]">prescriptions</span>
            <h2 className="font-bold">New Prescription Order</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-blue-100 text-blue-900 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100 text-sm">
            Patient: <strong>{patient.name}</strong> ({patient.uhid})
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1">Medication Name *</label>
            <input 
              type="text" 
              required
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. Paracetamol, Inj Fentanyl"
              value={formData.medicationName}
              onChange={(e) => setFormData({...formData, medicationName: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1">Dosage *</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. 500mg, 10mcg"
                value={formData.dosage}
                onChange={(e) => setFormData({...formData, dosage: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1">Route</label>
              <select 
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:border-blue-500"
                value={formData.route}
                onChange={(e) => setFormData({...formData, route: e.target.value})}
              >
                <option value="IV">Intravenous (IV)</option>
                <option value="PO">Oral (PO)</option>
                <option value="IM">Intramuscular (IM)</option>
                <option value="SC">Subcutaneous (SC)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1">Frequency</label>
              <select 
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:border-blue-500"
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value})}
              >
                <option value="STAT">STAT (Immediate)</option>
                <option value="SOS">SOS (As Needed)</option>
                <option value="OD">OD (Once Daily)</option>
                <option value="BID">BID (Twice Daily)</option>
                <option value="TID">TID (Three Times a Day)</option>
                <option value="QID">QID (Four Times a Day)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1">Urgency</label>
              <select 
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:border-blue-500"
                value={formData.urgency}
                onChange={(e) => setFormData({...formData, urgency: e.target.value})}
              >
                <option value="Routine">Routine</option>
                <option value="STAT">STAT</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="mt-2 flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
            <input 
              type="checkbox" 
              id="narcotic_vault"
              checked={formData.narcoticVault}
              onChange={(e) => setFormData({...formData, narcoticVault: e.target.checked})}
              className="mt-1"
            />
            <label htmlFor="narcotic_vault" className="text-sm text-red-900 cursor-pointer">
              <strong>Requires Narcotic Vault (Schedule X)</strong>
              <p className="text-xs mt-0.5 text-red-700 leading-snug">
                Check this if the medication is a controlled substance. Dispensing will require biometric dual-signature at the pharmacy.
              </p>
            </label>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Prescribing...' : 'Prescribe Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
