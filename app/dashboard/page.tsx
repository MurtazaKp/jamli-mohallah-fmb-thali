"use client";

import { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function TiffinCountDashboard() {
  const [totalActive, setTotalActive] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/total-count");
      const json = await res.json();

      if (!res.ok) {
        const msg = json.error || "Something went wrong. Please try again.";
        toast.error(msg, { position: "top-right" });
        return;
      }

      if (!json.success) {
        const msg = json.message || json.error || "Request was not completed.";

        const isTooEarly =
          msg.toLowerCase().includes("8 pm") ||
          msg.toLowerCase().includes("after 8");
        const isAlreadyDone =
          msg.toLowerCase().includes("already") ||
          msg.toLowerCase().includes("no changes");

        if (isTooEarly) {
          toast.warn("⏰ Count can only be saved after 8 PM IST.", {
            position: "top-right",
          });
        } else if (isAlreadyDone) {
          toast.info(" Today's count has already been saved.", {
            position: "top-right",
          });
        } else {
          toast.error(msg, { position: "top-right" });
        }
        return;
      }

      // Success
      setTotalActive(json.totalActive);
      toast.success(" Tiffin count updated successfully!", {
        position: "top-right",
      });
    } catch (err: any) {
      const msg = err.message || "Network error. Check your connection.";
      toast.error(msg, { position: "top-right" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col items-center justify-center p-4">
      <ToastContainer />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <h1 className="text-xl font-bold text-emerald-800 mb-8">
          FMB Thali System
        </h1>

        <div className="mb-8">
          <p className="text-sm text-gray-400 mb-2">Total Active Tiffins</p>
          <p className="text-8xl font-bold text-emerald-600">
            {loading && totalActive === null ? (
              <span className="text-gray-200 animate-pulse">—</span>
            ) : (
              (totalActive ?? "—")
            )}
          </p>
        </div>

        <button
          onClick={fetchCount}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white 
                     py-3 rounded-xl font-semibold transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {loading ? "Updating..." : "Refresh & Save to Sheet"}
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Developed by{" "}
        <a
          href="https://murtaza-dev.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-emerald-600"
        >
          Murtaza Khopoliwala
        </a>
      </p>
    </div>
  );
}
