"use client";

import { useState } from "react";
import { UserProps } from "@/app/types";
import { toast } from "react-toastify";

export default function Home() {
  const [its, setIts] = useState("");
  const [user, setUser] = useState<UserProps | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSearch = async () => {
    if (isUpdating) return;

    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ its }),
      });

      if (!res.ok) {
        toast.error("User Not Found");
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data);
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!user || isUpdating) return;

    const type = !user.status ? "stop" : "start";

    setIsUpdating(true);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          area: user.area,
          its: user.its,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const refreshRes = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ its }),
        });

        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json();
          setUser(refreshedData);
        }

        toast.success(
          `Thali successfully ${type === "start" ? "started" : "stopped"}!`,
        );
      } else {
        toast.error(data.error || "Something went wrong");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  };

  const isActive = !user?.status;

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col items-center p-4 sm:py-12">
      <div
        className={`w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 transition ${
          isUpdating ? "pointer-events-none opacity-80" : ""
        }`}
      >
        <h1 className="text-xl sm:text-2xl font-bold text-center text-emerald-800 mb-6">
          FMB Thali System
        </h1>

        {/* Search Section */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="number"
            pattern="[0-9]*"
            inputMode="numeric"
            placeholder="Enter ITS Number"
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl 
            focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
            outline-none text-black text-base 
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:pointer-events-none"
            value={its}
            onChange={(e) => setIts(e.target.value)}
            disabled={loading || isUpdating}
          />

          <button
            onClick={handleSearch}
            disabled={loading || isUpdating || !its}
            className="bg-emerald-600 active:scale-95 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all 
            disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Searching
              </>
            ) : (
              "Search"
            )}
          </button>
        </div>

        {/* User Card */}
        {user ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6 bg-gray-50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-500">
                Current Status
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isActive ? "ACTIVE" : "STOPPED"}
              </span>
            </div>

            <div className="space-y-4 mb-8">
              {[
                { label: "Name", value: user.name },
                { label: "Phone", value: user.phone },
                { label: "Area", value: user.area },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between border-b border-gray-50 pb-2"
                >
                  <span className="text-sm text-gray-400">{item.label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right ml-4">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-md transition-all 
              active:scale-[0.98] 
              disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center justify-center gap-2 ${
                isActive
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isUpdating ? (
                <>
                  <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Processing...
                </>
              ) : isActive ? (
                "Stop Thali"
              ) : (
                "Start Thali"
              )}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Enter your ITS number to manage your thali status
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center mt-auto">
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
