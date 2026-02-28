import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Train, MapPin, Users, Ticket, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trains' | 'stations' | 'bookings' | 'users'>('trains');
  const [trains, setTrains] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'trains') {
        const res = await api.get('/trains');
        setTrains(res.data);
      } else if (activeTab === 'stations') {
        const res = await api.get('/stations');
        setStations(res.data);
      } else if (activeTab === 'bookings') {
        const res = await api.get('/admin/bookings');
        setBookings(res.data);
      } else if (activeTab === 'users') {
        const res = await api.get('/admin/users');
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTrain = async (id: number) => {
    if (!window.confirm('Delete this train?')) return;
    await api.delete(`/trains/${id}`);
    fetchData();
  };

  const deleteStation = async (id: number) => {
    if (!window.confirm('Delete this station?')) return;
    await api.delete(`/stations/${id}`);
    fetchData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-12">
        <ShieldCheck className="h-8 w-8 text-emerald-600" />
        <h1 className="text-3xl font-bold text-slate-900">Admin Control Panel</h1>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        {[
          { id: 'trains', label: 'Trains', icon: Train },
          { id: 'stations', label: 'Stations', icon: MapPin },
          { id: 'bookings', label: 'All Bookings', icon: Ticket },
          { id: 'users', label: 'Users', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-medium">Loading data...</div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'trains' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Train</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Route</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Schedule</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {trains.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-900">{t.trainName}</p>
                        <p className="text-xs font-bold text-slate-400">#{t.trainNumber}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-700">{t.sourceStation} → {t.destinationStation}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-700">{t.departureTime} - {t.arrivalTime}</p>
                        <p className="text-xs font-medium text-slate-400">{t.runningDate}</p>
                      </td>
                      <td className="p-4">
                        <button onClick={() => deleteTrain(t.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'stations' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Station Name</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Code</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">City</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stations.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{s.stationName}</td>
                      <td className="p-4 font-mono text-sm text-emerald-600 font-bold">{s.stationCode}</td>
                      <td className="p-4 text-sm font-medium text-slate-600">{s.city}</td>
                      <td className="p-4">
                        <button onClick={() => deleteStation(s.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'bookings' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">PNR</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">User</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Train</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Fare</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono text-sm font-bold text-slate-900">{b.pnr}</td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-900">{b.userName}</p>
                        <p className="text-xs font-medium text-slate-400">{b.userEmail}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-900">{b.trainName}</p>
                        <p className="text-xs font-bold text-slate-400">#{b.trainNumber}</p>
                      </td>
                      <td className="p-4 font-bold text-emerald-600">₹{b.totalFare}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          b.bookingStatus === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {b.bookingStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'users' && (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Name</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Email</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{u.name}</td>
                      <td className="p-4 text-sm font-medium text-slate-600">{u.email}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
