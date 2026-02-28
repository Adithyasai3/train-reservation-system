import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Ticket, Calendar, MapPin, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Dashboard: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/my');
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (pnr: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.delete(`/bookings/cancel/${pnr}`);
      alert('Booking cancelled successfully');
      fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cancellation failed');
    }
  };

  if (loading) return <div className="p-20 text-center">Loading your dashboard...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-slate-500 font-medium">Manage your train reservations and travel history.</p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Ticket className="h-6 w-6 text-emerald-600" />
          My Bookings ({bookings.length})
        </h2>

        {bookings.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
            <p className="text-slate-500 font-medium">You haven't booked any tickets yet.</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking.id}
              className={`bg-white rounded-2xl shadow-sm border transition-all ${
                booking.bookingStatus === 'Cancelled' ? 'border-red-100 opacity-80' : 'border-slate-200'
              }`}
            >
              <div className="p-6 flex flex-wrap justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${booking.bookingStatus === 'Cancelled' ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    <Ticket className={`h-6 w-6 ${booking.bookingStatus === 'Cancelled' ? 'text-red-500' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{booking.trainName}</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase">PNR: {booking.pnr}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-400 uppercase">Date</p>
                    <p className="font-bold text-slate-900">{booking.journeyDate}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-400 uppercase">Status</p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      booking.bookingStatus === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {booking.bookingStatus}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setExpanded(expanded === booking.id ? null : booking.id)}
                    className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400"
                  >
                    {expanded === booking.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {booking.bookingStatus === 'Confirmed' && (
                    <button
                      onClick={() => handleCancel(booking.pnr)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <XCircle className="h-4 w-4" /> Cancel
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expanded === booking.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
                  >
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Journey Details</h4>
                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                          <div className="text-center">
                            <p className="text-lg font-bold text-slate-900">{booking.departureTime}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase">{booking.sourceStation}</p>
                          </div>
                          <div className="flex flex-col items-center px-4">
                            <div className="w-16 h-px bg-slate-200"></div>
                            <Clock className="h-4 w-4 text-slate-300 my-1" />
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-slate-900">{booking.arrivalTime}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase">{booking.destinationStation}</p>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-medium">Class: <span className="text-slate-900 font-bold">{booking.classType}</span></span>
                          <span className="text-slate-500 font-medium">Total Fare: <span className="text-emerald-600 font-bold">₹{booking.totalFare}</span></span>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Passengers ({booking.passengers.length})</h4>
                        <div className="space-y-3">
                          {booking.passengers.map((p: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                              <span className="font-bold text-slate-900">{p.name}</span>
                              <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase">
                                <span>{p.age} Yrs</span>
                                <span>{p.gender}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
