import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { Search, MapPin, Calendar } from 'lucide-react';

const Home: React.FC = () => {
  const [stations, setStations] = useState<any[]>([]);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/stations').then(res => setStations(res.data));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (source === destination) {
      alert('Source and Destination cannot be same');
      return;
    }
    navigate(`/search?source=${source}&destination=${destination}&date=${date}`);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      {/* Hero Section */}
      <div className="relative h-[400px] bg-slate-900 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&q=80&w=2000"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          alt="Train"
          referrerPolicy="no-referrer"
        />
        <div className="relative max-w-7xl mx-auto px-4 h-full flex flex-col justify-center items-center text-center">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Your Journey Starts Here
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl">
            Book train tickets across India with ease. Real-time availability, secure payments, and instant PNR generation.
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="max-w-4xl mx-auto -mt-20 px-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> From
              </label>
              <select
                required
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="">Select Station</option>
                {stations.map(s => (
                  <option key={s.id} value={s.stationName}>{s.stationName} ({s.stationCode})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> To
              </label>
              <select
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="">Select Station</option>
                {stations.map(s => (
                  <option key={s.id} value={s.stationName}>{s.stationName} ({s.stationCode})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
            >
              <Search className="h-5 w-5" />
              Search Trains
            </button>
          </form>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 py-24 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="text-center space-y-4">
          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
            <Search className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Easy Search</h3>
          <p className="text-slate-600">Find trains between any two stations in seconds with our optimized search engine.</p>
        </div>
        <div className="text-center space-y-4">
          <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Instant Booking</h3>
          <p className="text-slate-600">Book your tickets instantly with real-time seat availability and PNR generation.</p>
        </div>
        <div className="text-center space-y-4">
          <div className="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
            <LayoutDashboard className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Manage Tickets</h3>
          <p className="text-slate-600">View, download, or <Link to="/cancel" className="text-emerald-600 font-bold hover:underline">cancel</Link> your tickets anytime from your personalized dashboard.</p>
        </div>
      </div>
    </div>
  );
};

import { LayoutDashboard } from 'lucide-react';
export default Home;
