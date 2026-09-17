"use client";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";
export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = "Confirm action", message, confirmText = "Confirm", cancelText = "Cancel", variant = "danger", loading = false }) { return <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"><div className="p-6"><div className="flex gap-4"><div className={`flex h-10 w-10 items-center justify-center rounded-full ${variant === "danger" ? "bg-red-100" : "bg-amber-100"}`}><AlertTriangle size={20} className={variant === "danger" ? "text-red-600" : "text-amber-600"}/></div><p className="flex-1 text-sm text-gray-700">{message}</p></div><div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={loading}>{cancelText}</Button><Button variant={variant} onClick={onConfirm} loading={loading}>{confirmText}</Button></div></div></Modal>; }
