"use client";

import { useState } from "react";
import { UserProps } from "@/app/types";
import { toast } from "react-toastify";

export default function Home() {
  const [its, setIts] = useState("");
  const [user, setUser] = useState<UserProps | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ its }),
    });

    if (!res.ok) {
      toast.error("User Not Found");
      setUser(null);
      setLoading(false);
      return;
    }

    const data = await res.json();
    setUser(data);
    setLoading(false);
  };

  const handleUpdate = async (type: "start" | "stop") => {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        area: user?.area,
        rowIndex: user?.rowIndex,
      }),
    });

    if (res.ok) {
      toast.success(
        `Thali successfully ${type === "start" ? "started" : "stopped"}!`,
      );
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-emerald-800 mb-6">
          FMB Thali System
        </h1>

        {/* Search Section */}
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            placeholder="Enter ITS Number"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-black"
            value={its}
            onChange={(e) => setIts(e.target.value)}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {/* User Card */}
        {user ? (
          <div className="border-t pt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                User Details
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  user.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {user.status}
              </span>
            </div>

            <div className="space-y-3 text-gray-600 mb-8">
              <div className="flex justify-between">
                <span className="font-medium text-gray-400">Name</span>
                <span className="text-gray-900">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-400">Phone</span>
                <span className="text-gray-900">{user.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-400">Area</span>
                <span className="text-gray-900">{user.area}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                disabled={user.status === "ACTIVE"}
                onClick={() => handleUpdate("start")}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-all disabled:hidden"
              >
                Start Thali
              </button>
              <button
                disabled={user.status === "STOPPED"}
                onClick={() => handleUpdate("stop")}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold transition-all disabled:hidden"
              >
                Stop Thali
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400 italic">
            Enter Its Number to View Your Details
          </p>
        )}
      </div>
    </div>
  );
}
