import React, { useState } from 'react';
import { MapPin, Download, Loader2 } from 'lucide-react';

const AllocationPage = ({ showToast }) => {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    // TODO: Add API call to generate allocation
    // const response = await axios.post('/api/allocation/generate');
    setTimeout(() => {
      setGenerating(false);
      showToast('Seat allocation generated!', 'success');
    }, 2000);
  };

  const handleDownload = () => {
    // TODO: Add API call to download PDF
    // const response = await axios.get('/api/report/pdf', { responseType: 'blob' });
    showToast('PDF download started', 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Seat Allocation</h1>
            <p className="text-gray-600 mt-2">Generate and view seat allocations</p>
          </div>

          <div className="flex gap-4 mb-8">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Generating...
                </>
              ) : (
                <>
                  <MapPin size={20} />
                  Generate Allocation
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Download PDF
            </button>
          </div>

          {/* Sample Allocation Display */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Allocation Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Classroom</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Seat</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'STU001', name: 'Alice Johnson', room: 'Room A', seat: '1-3' },
                    { id: 'STU002', name: 'Bob Smith', room: 'Room A', seat: '2-4' },
                    { id: 'STU003', name: 'Charlie Brown', room: 'Room B', seat: '1-1' },
                    { id: 'STU004', name: 'Diana Prince', room: 'Room B', seat: '1-2' },
                    { id: 'STU005', name: 'Ethan Hunt', room: 'Room A', seat: '3-1' }
                  ].map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">{student.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{student.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{student.room}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{student.seat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllocationPage;