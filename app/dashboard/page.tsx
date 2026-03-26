"use client";

import { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function SnapshotDashboard() {
  const [loading, setLoading] = useState(false);

  const handleSnapshot = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/snapshot");
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Something went wrong");
        return;
      }

      if (!data.success) {
        const msg = data.message?.toLowerCase() || "";

        if (msg.includes("already")) {
          toast.info("📁 Already created today");
        } else if (msg.includes("8 pm")) {
          toast.warn("⏰ Only after 8 PM IST");
        } else {
          toast.error(data.message);
        }
        return;
      }

      toast.success("✅ Snapshot created!");

      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast.error("❌ Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50">
      <ToastContainer position="top-right" />

      <div className="bg-white p-8 rounded-2xl shadow-md text-center w-full max-w-sm">
        <h1 className="text-xl font-bold text-emerald-700 mb-6">
          Tiffin Snapshot System
        </h1>

        <button
          onClick={handleSnapshot}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 
                     text-white py-3 rounded-xl font-semibold transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Daily Snapshot"}
        </button>
      </div>
    </div>
  );
}
