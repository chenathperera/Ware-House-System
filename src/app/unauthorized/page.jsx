"use client";
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import Button from "../../components/ui/Button.jsx";
export default function UnauthorizedPage(){return <div className="flex min-h-screen items-center justify-center bg-gray-50"><div className="text-center"><ShieldOff className="mx-auto h-16 w-16 text-red-500"/><h1 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h1><p className="mt-2 text-gray-600">You don&apos;t have permission to view this page.</p><div className="mt-6 flex flex-col gap-3"><Link href="/dashboard"><Button className="w-full">Back to Dashboard</Button></Link><Button variant="outline" className="w-full" onClick={()=>{localStorage.clear();window.location.href="/login";}}>Logout &amp; Sign In Again</Button></div></div></div>;}
