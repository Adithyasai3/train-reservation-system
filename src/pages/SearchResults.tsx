import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Train, Clock, ArrowRight, User, Info } from 'lucide-react';
import { motion } from 'motion/react';

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [trains, setTrains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const source = searchParams.get('source');
  const destination = searchParams.get('destination');
  const date = searchParams.get('date');

  useEffect(() => {
    setLoading(true);
    api.get(`/trains/search?source=${source}&destination=${destination}&date=${date}`)
      .then(res => setTrains(res.data))
      .finally(() => setLoading(false));
  }, [source, destination, date]);

  const handleBook = (trainId: number, classType: string) => {
    navigate(`/booking?trainId=${trainId}&classType=${classType}&date=${date}`);
  };

  if (loading) return <div className="p-20 text-center">Searching for trains...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8 flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">From</p>
            <p className="text-xl font-bold text-slate-900">{source}</p>
          </div>
          <ArrowRight className="h-6 w-6 text-slate-300" />
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">To</p>
            <p className="text-xl font-bold text-slate-900">{destination}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Journey Date</p>
          <p className="text-lg font-semibold text-slate-900">{date}</p>
        </div>
      </div>

      {trains.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <Info className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900">No trains found</h3>
          <p className="text-slate-500">Try searching for a different route or date.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {trains.map((train) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={train.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 p-3 rounded-xl">
                    <Train className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{train.trainName}</h3>
                    <p className="text-sm font-medium text-slate-500">#{train.trainNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{train.departureTime}</p>
                    <p className="text-xs font-semibold text-slate-400 uppercase">{train.sourceStation}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-px bg-slate-200 relative">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-300"></div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Duration</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{train.arrivalTime}</p>
                    <p className="text-xs font-semibold text-slate-400 uppercase">{train.destinationStation}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 grid grid-cols-2 md:grid-cols-4 gap-4">
                {train.classes.map((cls: any) => (
                  <button
                    key={cls.id}
                    onClick={() => handleBook(train.id, cls.type)}
                    disabled={cls.availableSeats === 0}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      cls.availableSeats > 0 
                        ? 'bg-white border-slate-200 hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 cursor-pointer' 
                        : 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-900">{cls.type}</span>
                      <span className="text-emerald-600 font-bold">₹{cls.fare}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className={`text-xs font-bold ${cls.availableSeats > 20 ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {cls.availableSeats > 0 ? `AVL ${cls.availableSeats}` : 'NOT AVAILABLE'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
