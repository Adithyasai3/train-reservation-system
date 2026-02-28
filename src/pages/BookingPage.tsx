import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { User, Plus, Trash2, CreditCard, Train, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const BookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const trainId = searchParams.get('trainId');
  const classType = searchParams.get('classType');
  const date = searchParams.get('date');

  const [train, setTrain] = useState<any>(null);
  const [passengers, setPassengers] = useState([{ name: '', age: '', gender: 'Male' }]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }

    api.get('/trains').then(res => {
      const found = res.data.find((t: any) => t.id === Number(trainId));
      setTrain(found);
      setLoading(false);
    });
  }, [trainId, user, navigate]);

  const addPassenger = () => {
    setPassengers([...passengers, { name: '', age: '', gender: 'Male' }]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter((_, i) => i !== index));
    }
  };

  const updatePassenger = (index: number, field: string, value: string) => {
    const newPassengers = [...passengers];
    (newPassengers[index] as any)[field] = value;
    setPassengers(newPassengers);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBooking(true);
    try {
      const res = await api.post('/bookings', {
        trainId: Number(trainId),
        classType,
        passengers,
        journeyDate: date
      });
      alert(`Booking Successful! PNR: ${res.data.pnr}`);
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (loading || !train) return <div className="p-20 text-center">Loading booking details...</div>;

  const selectedClass = train.classes.find((c: any) => c.type === classType);
  const totalFare = selectedClass.fare * passengers.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        {/* Train Info */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <Train className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{train.trainName}</h2>
              <p className="text-slate-500 font-medium">#{train.trainNumber} | Class: {classType}</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">{train.departureTime}</p>
              <p className="text-sm font-bold text-slate-400 uppercase">{train.sourceStation}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300" />
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">{train.arrivalTime}</p>
              <p className="text-sm font-bold text-slate-400 uppercase">{train.destinationStation}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-400 uppercase">Date</p>
              <p className="text-lg font-bold text-slate-900">{date}</p>
            </div>
          </div>
        </div>

        {/* Passenger Form */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="h-6 w-6 text-emerald-600" />
              Passenger Details
            </h3>
            <button
              type="button"
              onClick={addPassenger}
              className="text-emerald-600 font-bold flex items-center gap-1 hover:text-emerald-500 transition-colors"
            >
              <Plus className="h-5 w-5" /> Add Passenger
            </button>
          </div>

          <form onSubmit={handleBooking} className="space-y-6">
            {passengers.map((p, index) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 bg-slate-50 rounded-xl relative group"
              >
                <div className="md:col-span-5 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                  <input
                    required
                    type="text"
                    value={p.name}
                    onChange={(e) => updatePassenger(index, 'name', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Full Name"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Age</label>
                  <input
                    required
                    type="number"
                    value={p.age}
                    onChange={(e) => updatePassenger(index, 'age', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Age"
                  />
                </div>
                <div className="md:col-span-4 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                  <select
                    value={p.gender}
                    onChange={(e) => updatePassenger(index, 'gender', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="md:col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removePassenger(index)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ))}

            <div className="pt-6 border-t border-slate-100">
              <button
                type="submit"
                disabled={booking}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CreditCard className="h-5 w-5" />
                {booking ? 'Processing...' : `Confirm & Pay ₹${totalFare}`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Fare Summary */}
      <div className="space-y-6">
        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl">
          <h3 className="text-xl font-bold mb-6">Fare Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-slate-400">
              <span>Base Fare ({classType})</span>
              <span>₹{selectedClass.fare}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Passengers</span>
              <span>x {passengers.length}</span>
            </div>
            <div className="h-px bg-slate-800 my-4"></div>
            <div className="flex justify-between text-xl font-bold">
              <span>Total Amount</span>
              <span className="text-emerald-400">₹{totalFare}</span>
            </div>
          </div>
          <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400 leading-relaxed">
              By clicking Confirm, you agree to our terms of service and cancellation policy. A refund of 80% is applicable on cancellations made 24h before departure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
