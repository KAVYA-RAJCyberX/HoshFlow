import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SelectablePatient } from '../../types';

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUhid, setSelectedUhid] = useState('');
  
  const [formData, setFormData] = useState({
    insuranceProvider: 'Self',
    totalAmount: '',
    tpaPaid: '',
    patientCoPay: ''
  });

  const { data: patients = [] } = useQuery<SelectablePatient[]>({
    queryKey: ['active-patients-for-billing'],
    queryFn: async () => {
      const res = await fetch('/api/patients', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token'}` }
      });
      if (!res.ok) throw new Error('Failed to fetch patients');
      return res.json();
    }
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUhid) return alert('Please select a patient.');
    
    setIsSubmitting(true);
    
    try {
      const patient = patients.find(p => p.uhid === selectedUhid);
      if (!patient) throw new Error('Patient not found');

      const token = localStorage.getItem('token') || 'mock-token';
      const payload = {
        uhid: patient.uhid,
        patientName: patient.name,
        wardBed: patient.bedId ? `${patient.ward} - ${patient.bedId}` : patient.ward,
        insuranceProvider: formData.insuranceProvider,
        totalAmount: Number(formData.totalAmount),
        tpaPaid: Number(formData.tpaPaid) || 0,
        patientCoPay: Number(formData.patientCoPay) || 0,
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create invoice');
      }

      onSuccess(`Generated new invoice for ${patient.name}`);
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
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-emerald-50">
          <div className="flex items-center gap-2 text-emerald-900">
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            <h2 className="font-bold">Generate New Invoice</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-emerald-100 text-emerald-900 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-600 mb-1">Select Patient *</label>
            <select 
              required
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:border-emerald-500"
              value={selectedUhid}
              onChange={(e) => setSelectedUhid(e.target.value)}
            >
              <option value="" disabled>Select active patient</option>
              {patients.map(p => (
                <option key={p.id} value={p.uhid}>{p.name} ({p.uhid}) - {p.ward}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1">Insurance Provider</label>
              <select 
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:border-emerald-500"
                value={formData.insuranceProvider}
                onChange={(e) => setFormData({...formData, insuranceProvider: e.target.value})}
              >
                <option value="Self">Self Pay</option>
                <option value="Star Health">Star Health</option>
                <option value="HDFC ERGO">HDFC ERGO</option>
                <option value="Apollo Munich">Apollo Munich</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1">Total Amount (₹) *</label>
              <input 
                type="number" 
                required min="0"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="e.g. 5000"
                value={formData.totalAmount}
                onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1">TPA Paid (₹)</label>
              <input 
                type="number" 
                min="0"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="e.g. 0"
                value={formData.tpaPaid}
                onChange={(e) => setFormData({...formData, tpaPaid: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-600 mb-1">Patient Co-Pay (₹) *</label>
              <input 
                type="number" 
                required min="0"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="e.g. 5000"
                value={formData.patientCoPay}
                onChange={(e) => setFormData({...formData, patientCoPay: e.target.value})}
              />
            </div>
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
              className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
