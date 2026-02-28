import React, { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Search, XCircle, AlertCircle, Ticket, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const CancelTicket: React.FC = () => {
  const [pnr, setPnr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please login to cancel your ticket.');
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.delete(`/bookings/cancel/${pnr.toUpperCase()}`);
      setSuccess(res.data.message);
      setPnr('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel ticket. Please check your PNR.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-200">
        <div className="text-center mb-10">
          <div className="bg-red-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Cancel Ticket</h2>
          <p className="text-slate-500 font-medium">Enter your PNR to initiate cancellation</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-600 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleCancel} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
              <Ticket className="h-4 w-4" /> PNR Number
            </label>
            <input
              required
              type="text"
              value={pnr}
              onChange={(e) => setPnr(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-mono uppercase"
              placeholder="E.G. PNR7X9Y2Z"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Cancel Booking'}
          </button>
        </form>

        <div className="mt-10 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Important Note</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cancellations are irreversible. Refunds are processed to the original payment method within 5-7 business days. A cancellation fee may apply.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CancelTicket;
