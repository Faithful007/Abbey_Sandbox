"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const AuthCtx = createContext({
  token: null,
  role: null,
  name: null,
  department: null,
  login: () => {},
  logout: () => {},
  setUser: () => {}
});

// Decode JWT claims (safe fallback)
function decodeClaims(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return {};
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload)
          .split("")
          .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
    );
    return json || {};
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [name, setName] = useState(null);
  const [department, setDepartment] = useState(null);

  // Load persisted auth
  useEffect(() => {
    try {
      const t = localStorage.getItem("auth_token");
      const r = localStorage.getItem("auth_role");
      const n = localStorage.getItem("auth_name");
      const d = localStorage.getItem("auth_department");
      if (t) setToken(t);
      if (r) setRole(r);
      if (n) setName(n);
      if (d) setDepartment(d);

      // If name/department missing but token exists, attempt decode
      if (t && (!n || !d)) {
        const claims = decodeClaims(t);
        const derivedName =
          n ||
          claims.name ||
          claims.fullName ||
          [claims.given_name, claims.family_name].filter(Boolean).join(" ") ||
          claims.username ||
          null;
        const derivedDept =
          d ||
          claims.department ||
          claims.dept ||
          claims.unit ||
          claims.role ||
          null;
        if (derivedName) {
          setName(derivedName);
          localStorage.setItem("auth_name", derivedName);
        }
        if (derivedDept) {
          setDepartment(derivedDept);
          localStorage.setItem("auth_department", derivedDept);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const login = useCallback((t, r, userName, userDepartment) => {
    try {
      if (t) {
        localStorage.setItem("auth_token", t);
        setToken(t);
      }
      if (r) {
        localStorage.setItem("auth_role", r);
        setRole(r);
      }

      // Auto derive name/department if not provided
      if ((!userName || !userDepartment) && t) {
        const claims = decodeClaims(t);
        userName =
          userName ||
          claims.name ||
          claims.fullName ||
          [claims.given_name, claims.family_name].filter(Boolean).join(" ") ||
          claims.username ||
          null;
        userDepartment =
          userDepartment ||
          claims.department ||
          claims.dept ||
          claims.unit ||
          claims.role ||
          null;
      }

      if (userName) {
        localStorage.setItem("auth_name", userName);
        setName(userName);
      }
      if (userDepartment) {
        localStorage.setItem("auth_department", userDepartment);
        setDepartment(userDepartment);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setUser = useCallback((userName, userDepartment) => {
    if (userName !== undefined) {
      userName === null
        ? localStorage.removeItem("auth_name")
        : localStorage.setItem("auth_name", userName);
      setName(userName);
    }
    if (userDepartment !== undefined) {
      userDepartment === null
        ? localStorage.removeItem("auth_department")
        : localStorage.setItem("auth_department", userDepartment);
      setDepartment(userDepartment);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_role");
      localStorage.removeItem("auth_name");
      localStorage.removeItem("auth_department");
    } catch {
      /* ignore */
    }
    setToken(null);
    setRole(null);
    setName(null);
    setDepartment(null);
  }, []);

  return (
    <AuthCtx.Provider
      value={{ token, role, name, department, login, logout, setUser }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

// "use client";
// import React, { createContext, useContext, useEffect, useState } from 'react';

// const AuthCtx = createContext({ token: null, role: null, login: () => {}, logout: () => {} });

// export function AuthProvider({ children }) {
//   const [token, setToken] = useState(null);
//   const [role, setRole] = useState(null);

//   useEffect(() => {
//     const t = localStorage.getItem('auth_token');
//     const r = localStorage.getItem('auth_role');
//     if (t) setToken(t);
//     if (r) setRole(r);
//   }, []);

//   const login = (t, r) => {
//     localStorage.setItem('auth_token', t);
//     localStorage.setItem('auth_role', r);
//     setToken(t);
//     setRole(r);
//   };

//   const logout = () => {
//     localStorage.removeItem('auth_token');
//     localStorage.removeItem('auth_role');
//     setToken(null);
//     setRole(null);
//   };

//   return (
//     <AuthCtx.Provider value={{ token, role, login, logout }}>
//       {children}
//     </AuthCtx.Provider>
//   );
// }

// export function useAuth() {
//   return useContext(AuthCtx);
// }