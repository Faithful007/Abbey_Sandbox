"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from "../../components/AuthContext";

export default function RegistrationList() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState('');
  const { token, role, name, logout } = useAuth();

  useEffect(() => {
    // Auth guard
    if (!token) {
      router.replace('/login');
      return;
    }
    // Only admins can access this page
    if (role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    
    fetchRegistrations();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, token, role]);

  async function fetchRegistrations() {
    try {
      setError('');
      const res = await fetch(`http://localhost:3000/api/registrations?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRegistrations(data.data || []);
      setPagination(data.pagination || null);
    } catch (e) {
      setError('Failed to fetch registrations (admin token required).');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('http://localhost:3000/api/registrations-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStats(data.data);
    } catch {
      // ignore stats errors
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return fetchRegistrations();
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:3000/api/registrations/search/${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRegistrations(data.data || []);
    } catch {
      setError('Search failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this registration?')) return;
    try {
      const res = await fetch(`http://localhost:3000/api/registrations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRegistrations();
      await fetchStats();
    } catch {
      alert('Failed to delete registration');
    }
  }

  const handleLogout = () => {
    logout(); // Use AuthContext logout
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">BEC Registrations</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/registration')}
              className="bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-indigo-700 transition"
            >
              + New Registration
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-700 text-white py-2 px-6 rounded-lg hover:bg-gray-800 transition"
            >
              Sign out
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {stats && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded">
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Registrations</p>
              </div>
              {stats.byUnit?.slice(0, 3).map((unit, idx) => (
                <div key={idx} className="text-center p-4 bg-green-50 rounded">
                  <p className="text-3xl font-bold text-green-600">{unit.count}</p>
                  <p className="text-sm text-gray-600">{unit.unit_in_BEC}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, email, or unit..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSearch}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Search
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                fetchRegistrations();
              }}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {registrations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No registrations found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BEC Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {registrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{reg.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{reg.first_name} {reg.last_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{reg.age}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{reg.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{reg.mobile}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{reg.unit_in_BEC}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            reg.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {reg.role || 'user'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => router.push(`/registration/edit/${reg.id}`)}
                            className="text-indigo-600 hover:text-indigo-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(reg.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {pagination && (
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
                  <div className="text-sm text-gray-700">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// "use client";

// import React, { useState, useEffect } from 'react';
// import { useRouter } from 'next/router';
// import { useAuth } from "../../components/AuthContext";

// export default function RegistrationList() {
//   const router = useRouter();
//   const [registrations, setRegistrations] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [stats, setStats] = useState(null);
//   const [page, setPage] = useState(1);
//   const [pagination, setPagination] = useState(null);
//   const [error, setError] = useState('');
//   const { token, role, name, logout } = useAuth();
//   const [users, setUsers] = useState([]);
  

//   // const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

//   useEffect(() => {
//     if (!token) {
//       router.push('/login');
//       return;
//     }
//     fetchRegistrations();
//     fetchStats();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [page]);

//   async function fetchRegistrations() {
//     try {
//       setError('');
//       const res = await fetch(`http://localhost:3000/api/registrations?page=${page}&limit=10`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       if (!res.ok) throw new Error(await res.text());
//       const data = await res.json();
//       setRegistrations(data.data || []);
//       setPagination(data.pagination || null);
//     } catch (e) {
//       setError('Failed to fetch registrations (admin token required).');
//       setRegistrations([]);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function fetchStats() {
//     try {
//       const res = await fetch('http://localhost:3000/api/registrations-stats', {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       if (!res.ok) throw new Error(await res.text());
//       const data = await res.json();
//       setStats(data.data);
//     } catch {
//       // ignore stats errors
//     }
//   }

//   async function handleSearch() {
//     if (!searchQuery.trim()) return fetchRegistrations();
//     try {
//       setLoading(true);
//       const res = await fetch(
//         `http://localhost:3000/api/registrations/search/${encodeURIComponent(searchQuery)}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (!res.ok) throw new Error(await res.text());
//       const data = await res.json();
//       setRegistrations(data.data || []);
//     } catch {
//       setError('Search failed.');
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function handleDelete(id) {
//     if (!confirm('Are you sure you want to delete this registration?')) return;
//     try {
//       const res = await fetch(`http://localhost:3000/api/registrations/${id}`, {
//         method: 'DELETE',
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       if (!res.ok) throw new Error(await res.text());
//       await fetchRegistrations();
//       await fetchStats();
//     } catch {
//       alert('Failed to delete registration');
//     }
//   }

//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('role');
//     router.push('/login');
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-7xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <h1 className="text-3xl font-bold text-gray-800">BEC Registrations</h1>
//           <div className="flex gap-2">
//             <button
//               onClick={() => router.push('/registration')}
//               className="bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-indigo-700 transition"
//             >
//               + New Registration
//             </button>
//             <button
//               onClick={handleLogout}
//               className="bg-gray-600 text-white py-2 px-6 rounded-lg hover:bg-gray-700 transition"
//             >
//               Logout
//             </button>
//           </div>
//         </div>

//         {error && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//             {error}
//           </div>
//         )}

//         {stats && (
//           <div className="bg-white rounded-lg shadow p-6 mb-6">
//             <h2 className="text-xl font-semibold mb-4">Statistics</h2>
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//               <div className="text-center p-4 bg-blue-50 rounded">
//                 <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
//                 <p className="text-sm text-gray-600">Total Registrations</p>
//               </div>
//               {stats.byUnit?.slice(0, 3).map((unit, idx) => (
//                 <div key={idx} className="text-center p-4 bg-green-50 rounded">
//                   <p className="text-3xl font-bold text-green-600">{unit.count}</p>
//                   <p className="text-sm text-gray-600">{unit.unit_in_BEC}</p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         <div className="bg-white rounded-lg shadow p-4 mb-6">
//           <div className="flex gap-2">
//             <input
//               type="text"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
//               placeholder="Search by name, email, or unit..."
//               className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
//             />
//             <button
//               onClick={handleSearch}
//               className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
//             >
//               Search
//             </button>
//             <button
//               onClick={() => {
//                 setSearchQuery('');
//                 fetchRegistrations();
//               }}
//               className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
//             >
//               Clear
//             </button>
//           </div>
//         </div>

//         <div className="bg-white rounded-lg shadow overflow-hidden">
//           {loading ? (
//             <div className="p-8 text-center">Loading...</div>
//           ) : registrations.length === 0 ? (
//             <div className="p-8 text-center text-gray-500">No registrations found</div>
//           ) : (
//             <>
//               <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                   <thead className="bg-gray-50">
//                     <tr>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BEC Unit</th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
//                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
//                     </tr>
//                   </thead>
//                   <tbody className="bg-white divide-y divide-gray-200">
//                     {registrations.map((reg) => (
//                       <tr key={reg.id} className="hover:bg-gray-50">
//                         <td className="px-6 py-4 text-sm text-gray-900">{reg.id}</td>
//                         <td className="px-6 py-4 text-sm text-gray-900">{reg.first_name} {reg.last_name}</td>
//                         <td className="px-6 py-4 text-sm text-gray-900">{reg.age}</td>
//                         <td className="px-6 py-4 text-sm text-gray-900">{reg.email}</td>
//                         <td className="px-6 py-4 text-sm text-gray-900">{reg.mobile}</td>
//                         <td className="px-6 py-4 text-sm text-gray-900">{reg.unit_in_BEC}</td>
//                         <td className="px-6 py-4 text-sm">
//                           <span className={`px-2 py-1 rounded text-xs ${
//                             reg.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
//                           }`}>
//                             {reg.role}
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 text-sm">
//                           <button
//                             onClick={() => router.push(`/registration/edit/${reg.id}`)}
//                             className="text-indigo-600 hover:text-indigo-800 mr-3"
//                           >
//                             Edit
//                           </button>
//                           <button
//                             onClick={() => handleDelete(reg.id)}
//                             className="text-red-600 hover:text-red-800"
//                           >
//                             Delete
//                           </button>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
              
//               {pagination && (
//                 <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
//                   <div className="text-sm text-gray-700">
//                     Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
//                   </div>
//                   <div className="flex gap-2">
//                     <button
//                       onClick={() => setPage(p => Math.max(1, p - 1))}
//                       disabled={page === 1}
//                       className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
//                     >
//                       Previous
//                     </button>
//                     <button
//                       onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
//                       disabled={page === pagination.totalPages}
//                       className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
//                     >
//                       Next
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

