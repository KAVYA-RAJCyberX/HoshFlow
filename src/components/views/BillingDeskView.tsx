import React, { useState } from 'react';
import { ViewType } from '../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface BillingDeskViewProps {
  onNavigate: (view: ViewType) => void;
  onTriggerToast: (msg: string) => void;
}

interface Invoice {
  id: string;
  uhid: string;
  patientName: string;
  clearanceStatus: string;
  totalAmount: number;
  tpaProvider?: string;
  tpaPaid?: number;
  patientCoPay?: number;
  wardBed?: string;
  insuranceProvider?: string;
  dateTime?: string;
  claimQueryNote?: string;
  [key: string]: unknown;
}

export const BillingDeskView: React.FC<BillingDeskViewProps> = ({
  onNavigate,
  onTriggerToast
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'cleared' | 'pending' | 'query' | 'discharged'>('all');
  const [aaravCleared, setAaravCleared] = useState(false);
  const [priyaQueryResolved, setPriyaQueryResolved] = useState(false);
  const queryClient = useQueryClient();

  // Fetch Invoices
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch('/api/invoices', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    }
  });

  // Mutate Invoice
  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch(`/api/billing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update invoice');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  const printReceiptMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('hosflow_jwt') || '';
      const res = await fetch(`/api/billing/${id}/receipt`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate receipt');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onTriggerToast(data.message);
    }
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (activeFilter === 'cleared') return inv.clearanceStatus === 'cleared';
    if (activeFilter === 'pending') return inv.clearanceStatus === 'co_pay_pending';
    if (activeFilter === 'query') return inv.clearanceStatus === 'tpa_query';
    if (activeFilter === 'discharged') return inv.clearanceStatus === 'discharged';
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-10 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
              Cashless & TPA Desk
            </span>
            <span className="text-neutral-400">•</span>
            <span className="text-xs text-neutral-500 font-medium">Live Ledger Sync Active</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Financial Overview & Hospital Invoicing
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 max-w-2xl">
            Review patient admissions, TPA cashless approvals, patient co-pays, and clear billing for discharge.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-black/5 text-xs text-neutral-700 font-semibold">
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            <span>May 2026</span>
          </div>
          <button 
            onClick={() => onTriggerToast('Exporting TPA Settlement reconciliation summary (XLSX)...')}
            className="flex items-center gap-1.5 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold px-3.5 py-2 rounded-full shadow-sm border border-black/5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>TPA Summary</span>
          </button>
          <button 
            onClick={() => onTriggerToast('New patient invoice template opened.')}
            className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Generate New Invoice</span>
          </button>
        </div>
      </div>

      {/* Bento Distribution & Operational Acuity Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Financial Distribution Card with SVG Donut */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-black/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Inflow Metrics</span>
              <h2 className="text-lg font-bold text-neutral-900 mt-0.5">Total Billed Volume</h2>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-neutral-900 tracking-tight">₹42.8 <span className="text-lg font-semibold">Lakhs</span></span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">Month to Date</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="material-symbols-outlined text-[15px]">trending_up</span>
              <span>+14.2% vs Apr</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center mt-6">
            {/* SVG Donut */}
            <div className="sm:col-span-5 flex items-center justify-center">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#f0eee8" strokeWidth="12" />
                  {/* Cashless Settled 73% */}
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#141416" strokeDasharray="174 239" strokeDashoffset="0" strokeLinecap="round" strokeWidth="12" />
                  {/* Co-pays 20% */}
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#fcde6d" strokeDasharray="48 239" strokeDashoffset="-174" strokeLinecap="round" strokeWidth="12" />
                  {/* Pending 7% */}
                  <circle cx="50" cy="50" fill="transparent" r="38" stroke="#f9c7d4" strokeDasharray="17 239" strokeDashoffset="-222" strokeLinecap="round" strokeWidth="12" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-neutral-900">89%</span>
                  <span className="text-[11px] text-neutral-500 font-medium">Cleared</span>
                </div>
              </div>
            </div>

            {/* Metric Details Legend */}
            <div className="sm:col-span-7 space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-2xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#141416]"></span>
                  <div>
                    <span className="font-semibold text-neutral-900 block">Cashless Insurance Settled</span>
                    <span className="text-[10px] text-neutral-500">42 Claims Approved</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-neutral-900">₹31.2 L</span>
                  <span className="text-[10px] text-neutral-500 block">73% of total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-2xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#fcde6d]"></span>
                  <div>
                    <span className="font-semibold text-neutral-900 block">Patient Co-pays & Cash</span>
                    <span className="text-[10px] text-neutral-500">UPI, Card, Cash desk</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-neutral-900">₹8.4 L</span>
                  <span className="text-[10px] text-neutral-500 block">20% of total</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-2xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f9c7d4]"></span>
                  <div>
                    <span className="font-semibold text-neutral-900 block">Pending Discharge Settlements</span>
                    <span className="text-[10px] text-neutral-500">Action needed prior gate-pass</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-rose-800">₹3.2 L</span>
                  <span className="text-[10px] text-rose-700 block font-semibold">7% pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats & Shift Performance */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Avg TPA Turnaround</span>
              <p className="text-2xl font-bold text-neutral-900 mt-1">42 <span className="text-sm font-semibold text-neutral-500">minutes</span></p>
              <p className="text-xs text-neutral-500 mt-1">From final bill upload to discharge auth</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">timer</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                  <span>Immediate Discharge Hold</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">2 Blocked</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Physician discharge clearance granted, but hospital pharmacy & TPA final accounts require reconciliation before the gate-pass QR can be dispatched.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-2 border-t border-neutral-100">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold border-2 border-white">AM</div>
                <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-900 flex items-center justify-center text-xs font-bold border-2 border-white">PS</div>
              </div>
              <button 
                onClick={() => onNavigate('discharge_hub')}
                className="text-xs font-bold text-neutral-900 hover:underline flex items-center gap-1"
              >
                Resolve in Discharge Hub →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Required: Patients Awaiting Discharge Clearance */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600 text-[22px]">notification_important</span>
            <h2 className="text-base font-bold text-neutral-900">Action Required: Patients Awaiting Discharge Clearance</h2>
          </div>
          <span className="text-[11px] text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full font-semibold">Updated 2m ago</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Aarav Mehta */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-base">
                    AM
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Aarav Mehta</h3>
                    <p className="text-xs text-neutral-500">UHID: HOS-2026-1001 • Med Ward A (M-104)</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  aaravCleared ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {aaravCleared ? 'Cleared' : 'Co-pay Pending'}
                </span>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center text-xs mb-3">
                <div>
                  <span className="text-[10px] text-neutral-400 block font-bold uppercase">Total Billed</span>
                  <span className="text-sm font-bold text-neutral-900 mt-0.5 block">₹48,500</span>
                </div>
                <div className="border-x border-neutral-200">
                  <span className="text-[10px] text-neutral-400 block font-bold uppercase">TPA Paid</span>
                  <span className="text-sm font-bold text-neutral-900 mt-0.5 block">₹40,000</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-700 block font-bold uppercase">Pending Co-Pay</span>
                  <span className="text-sm font-bold text-rose-700 mt-0.5 block">
                    {aaravCleared ? '₹0 (Paid)' : '₹8,500'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 text-xs text-neutral-700 flex items-center justify-between">
                <span>Star Health TPA • Claim #SH-99210-A</span>
                <span className="text-neutral-500 font-medium">Room rent disallowed: ₹8.5k</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-neutral-100">
              <button 
                onClick={() => {
                  setAaravCleared(true);
                  updateInvoiceMutation.mutate({ id: 'INV-2048', data: { clearanceStatus: 'cleared', patientCoPay: 0 } });
                  onTriggerToast('Aarav Mehta ₹8,500 co-pay collected via UPI. Gate pass unlocked!');
                }}
                disabled={aaravCleared}
                className={`w-full sm:flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                  aaravCleared ? 'bg-emerald-100 text-emerald-900' : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">done_all</span>
                <span>{aaravCleared ? 'Payment Cleared' : 'Clear Payment & Release Discharge'}</span>
              </button>
              <button 
                onClick={() => onTriggerToast('SMS payment link dispatched to +91 98230 XXXXX.')}
                className="w-full sm:w-auto py-2.5 px-4 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">send_to_mobile</span>
                <span>Send Payment Link</span>
              </button>
            </div>
          </div>

          {/* Card 2: Priya Sharma */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-900 font-bold flex items-center justify-center text-base">
                    PS
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Priya Sharma</h3>
                    <p className="text-xs text-neutral-500">UHID: HOS-2026-1002 • Surgical Bay (S-202)</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  priyaQueryResolved ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}>
                  {priyaQueryResolved ? 'Query Resolved' : 'Blocked Discharge'}
                </span>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center text-xs mb-3">
                <div>
                  <span className="text-[10px] text-neutral-400 block font-bold uppercase">Total Billed</span>
                  <span className="text-sm font-bold text-neutral-900 mt-0.5 block">₹1,12,000</span>
                </div>
                <div className="border-x border-neutral-200">
                  <span className="text-[10px] text-neutral-400 block font-bold uppercase">Claim Status</span>
                  <span className={`text-sm font-bold mt-0.5 block ${priyaQueryResolved ? 'text-emerald-800' : 'text-rose-700'}`}>
                    {priyaQueryResolved ? 'Settled' : 'Query Raised'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block font-bold uppercase">Claim Submissions</span>
                  <span className="text-sm font-bold text-neutral-900 mt-0.5 block">₹1,12,000</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900">
                ICICI Lombard Health TPA: Query on implant breakdown & surgical consumable invoice #SURG-44.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-neutral-100">
              <button 
                onClick={() => {
                  setPriyaQueryResolved(true);
                  updateInvoiceMutation.mutate({ id: 'INV-2045', data: { clearanceStatus: 'co_pay_pending', claimQueryNote: 'Query resolved with ICICI Lombard' } });
                  onTriggerToast('Implant batch certificates uploaded to ICICI Lombard portal. Query cleared!');
                }}
                disabled={priyaQueryResolved}
                className={`w-full sm:flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                  priyaQueryResolved ? 'bg-emerald-100 text-emerald-900' : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">quickreply</span>
                <span>{priyaQueryResolved ? 'Resolved' : 'Resolve TPA Query'}</span>
              </button>
              <button 
                onClick={() => onTriggerToast('Consumable itemized breakdown reprinted.')}
                className="w-full sm:w-auto py-2.5 px-4 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Reprint Breakdown</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Transactions & Invoices Table */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Billing Transactions & Invoices</h2>
            <p className="text-xs text-neutral-500">Real-time ledger entries across inpatient, daycare, and critical care bays</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 p-1 rounded-full">
            {[
              { id: 'all', label: 'All' },
              { id: 'cleared', label: 'Cleared' },
              { id: 'pending', label: 'Pending Clearance' },
              { id: 'query', label: 'Insurance TPA Query' },
              { id: 'discharged', label: 'Discharged' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeFilter === f.id
                    ? 'bg-black text-white shadow-sm'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3 rounded-l-xl">Invoice ID</th>
                <th className="py-3 px-3">Patient Name</th>
                <th className="py-3 px-3">Ward / Bed</th>
                <th className="py-3 px-3">Insurance Provider</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3">Clearance Status</th>
                <th className="py-3 px-3 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-neutral-900">{inv.id}</td>
                  <td className="py-3.5 px-3">
                    <span className="font-bold text-neutral-900 block">{inv.patientName}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{inv.uhid}</span>
                  </td>
                  <td className="py-3.5 px-3 text-neutral-600">{inv.wardBed}</td>
                  <td className="py-3.5 px-3 text-neutral-700">{inv.insuranceProvider}</td>
                  <td className="py-3.5 px-3 text-neutral-500">{inv.dateTime}</td>
                  <td className="py-3.5 px-3 text-right font-bold text-neutral-900">
                    ₹{inv.totalAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                      inv.clearanceStatus === 'cleared' ? 'bg-emerald-100 text-emerald-900' :
                      inv.clearanceStatus === 'co_pay_pending' ? 'bg-amber-100 text-amber-900' :
                      inv.clearanceStatus === 'tpa_query' ? 'bg-rose-100 text-rose-900' :
                      inv.clearanceStatus === 'discharged' ? 'bg-neutral-200 text-neutral-800' :
                      'bg-neutral-100 text-neutral-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        inv.clearanceStatus === 'cleared' ? 'bg-emerald-600' :
                        inv.clearanceStatus === 'co_pay_pending' ? 'bg-amber-600' :
                        inv.clearanceStatus === 'tpa_query' ? 'bg-rose-600' :
                        'bg-neutral-600'
                      }`}></span>
                      {inv.clearanceStatus === 'cleared' ? 'Cleared (Paid)' :
                       inv.clearanceStatus === 'co_pay_pending' ? `Co-pay Pending (₹${inv.patientCoPay})` :
                       inv.clearanceStatus === 'tpa_query' ? 'TPA Query Raised' :
                       inv.clearanceStatus === 'discharged' ? 'Discharged' : 'In Progress'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => printReceiptMutation.mutate(inv.id)}
                        className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700" 
                        title="Print Receipt"
                      >
                        <span className="material-symbols-outlined text-[16px]">receipt</span>
                      </button>
                      <button 
                        onClick={() => onTriggerToast(`Viewing full clinical billing folio for ${inv.patientName}...`)}
                        className="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700" 
                        title="View Details"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
