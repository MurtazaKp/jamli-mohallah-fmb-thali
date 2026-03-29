"use client";

import { useState } from "react";
import { UserProps } from "@/app/types";
import { toast } from "react-toastify";

export default function Home() {
  const [its, setIts] = useState("");
  const [phone, setPhone] = useState("");
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
        body: JSON.stringify({ its, phone }),
      });

      if (!res.ok) {
        toast.error("User not found or phone mismatch");
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
          body: JSON.stringify({ its, phone }),
        });

        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json();
          setUser(refreshedData);
        }

        toast.success(
          `Thali successfully ${type === "start" ? "started" : "STOP"}!`,
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
        <div className="flex flex-col gap-3 mb-8">
          <input
            type="number"
            placeholder="Enter ITS Number"
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
            value={its}
            onChange={(e) => setIts(e.target.value)}
            disabled={loading || isUpdating}
          />

          <input
            type="tel"
            placeholder="Enter Phone Number"
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading || isUpdating}
          />

          <button
            onClick={handleSearch}
            disabled={loading || isUpdating || !its || !phone}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 flex justify-center items-center gap-2"
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
          <div>
            <div className="flex justify-between mb-6 bg-gray-50 p-3 rounded-lg">
              <span className="text-sm text-gray-500">Current Status</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isActive ? "ACTIVE" : "STOP"}
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <p>
                <b>Name:</b> {user.name}
              </p>
              <p>
                <b>Phone:</b> {user.phone}
              </p>
              <p>
                <b>Area:</b> {user.area}
              </p>
            </div>

            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className={`w-full py-3 rounded-xl text-white ${
                isActive ? "bg-red-500" : "bg-green-600"
              }`}
            >
              {isUpdating
                ? "Processing..."
                : isActive
                  ? "Stop Thali"
                  : "Start Thali"}
            </button>
          </div>
        ) : (
          <p className="text-center text-gray-500 text-sm">
            Enter ITS & Phone to search to manage your Thali status
          </p>
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
