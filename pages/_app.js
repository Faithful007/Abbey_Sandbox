import "../styles/globals.css";
import { AuthProvider, useAuth } from "../components/AuthContext";
import { useRouter } from "next/router";

function TopBar() {
  const { name, department } = useAuth() || {};
  const router = useRouter();

  const hide =
    router.pathname === "/login" ||
    router.pathname.startsWith("/registration") ||
    router.pathname.startsWith("/forgot-password");

  if (hide) return null;
  if (!name && !department) return null;

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-100 border-b border-gray-200/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-start">
        <div className="text-sm text-gray-600">
          Signed in as <span className="font-medium text-gray-900">{name || "User"}</span>
          {department ? <span className="text-gray-400"> • </span> : null}
          {department ? (
            <span className="font-medium text-indigo-600">{department}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <TopBar />
      <Component {...pageProps} />
    </AuthProvider>
  );
}

// ...existing code...
// import "../styles/globals.css"; // keep your global imports
// import { AuthProvider, useAuth } from "../components/AuthContext";
// import { useRouter } from "next/router";

// function TopBar() {
//   const { name, department, logout } = useAuth() || {};
//   const router = useRouter();

//   const hide =
//     router.pathname === "/login" ||
//     router.pathname.startsWith("/registration") ||
//     router.pathname.startsWith("/forgot-password");

//   if (hide) return null;
//   if (!name && !department) return null;

//   return (
//     <div className="w-full bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
//       <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
//         <div className="text-sm text-gray-600">
//           Signed in as <span className="font-medium text-gray-900">{name || "User"}</span>
//           {department ? <span className="text-gray-400"> • </span> : null}
//           {department ? (
//             <span className="font-medium text-indigo-600">{department}</span>
//           ) : null}
//         </div>
//         <button
//           onClick={logout}
//           className="bg-gray-800 text-white text-sm px-4 py-1.5 rounded-md hover:bg-gray-900"
//         >
//           Sign out
//         </button>
//       </div>
//     </div>
//   );
// }

// export default function App({ Component, pageProps }) {
//   return (
//     <AuthProvider>
//       <TopBar />
//       <Component {...pageProps} />
//     </AuthProvider>
//   );
// }
// ...existing code...

// import '../styles/globals.css'
// import { AuthProvider } from '../components/AuthContext';

// export default function MyApp({ Component, pageProps }) {
//   return (
//     <AuthProvider>
//       <Component {...pageProps} />
//     </AuthProvider>
//   );
// }