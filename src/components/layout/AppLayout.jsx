"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../../client/store/authStore.js";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
export default function AppLayout({ children }) { const user = useAuthStore((state) => state.user); const pathname=usePathname(); const [sidebarOpen,setSidebarOpen]=useState(false); useEffect(()=>{ const desktop=window.innerWidth>1024; setSidebarOpen(desktop); const resize=()=>{ if(window.innerWidth>1024)setSidebarOpen(true); }; window.addEventListener("resize",resize); return()=>window.removeEventListener("resize",resize); },[]); useEffect(()=>{if(window.innerWidth<=1024)setSidebarOpen(false);},[pathname]); return <div className="flex h-screen overflow-hidden bg-gray-50"><Sidebar userRole={user?.role} isOpen={sidebarOpen} onClose={()=>setSidebarOpen(false)}/><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><Header onToggleSidebar={()=>setSidebarOpen((open)=>!open)}/><main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main></div></div>; }
