"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    visaEmail: "",
    visaPassword: "",
    currentDate: "",
    scheduleId: "",
    facilityId: "25",
    notEarlierThan: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create New Monitoring Job
          </h1>
          <p className="text-gray-600 mb-8">
            Enter your visa appointment details to start monitoring for earlier dates
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="visaEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Visa Account Email *
              </label>
              <input
                id="visaEmail"
                type="email"
                value={formData.visaEmail}
                onChange={(e) => setFormData({ ...formData, visaEmail: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="your-visa-account@example.com"
              />
              <p className="text-sm text-gray-500 mt-1">
                Your US visa appointment system login email
              </p>
            </div>

            <div>
              <label htmlFor="visaPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Visa Account Password *
              </label>
              <input
                id="visaPassword"
                type="password"
                value={formData.visaPassword}
                onChange={(e) => setFormData({ ...formData, visaPassword: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <p className="text-sm text-gray-500 mt-1">
                Your password will be encrypted and stored securely
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="currentDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Appointment Date *
                </label>
                <input
                  id="currentDate"
                  type="date"
                  value={formData.currentDate}
                  onChange={(e) => setFormData({ ...formData, currentDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="scheduleId" className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule ID *
                </label>
                <input
                  id="scheduleId"
                  type="text"
                  value={formData.scheduleId}
                  onChange={(e) => setFormData({ ...formData, scheduleId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="72409682"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Found in your appointment URL
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="facilityId" className="block text-sm font-medium text-gray-700 mb-2">
                  Facility ID
                </label>
                <input
                  id="facilityId"
                  type="text"
                  value={formData.facilityId}
                  onChange={(e) => setFormData({ ...formData, facilityId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="25"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Default: 25 (Bogota)
                </p>
              </div>

              <div>
                <label htmlFor="notEarlierThan" className="block text-sm font-medium text-gray-700 mb-2">
                  Not Earlier Than (Optional)
                </label>
                <input
                  id="notEarlierThan"
                  type="date"
                  value={formData.notEarlierThan}
                  onChange={(e) => setFormData({ ...formData, notEarlierThan: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Don't book before this date
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• We'll check for earlier appointments every 60 seconds</li>
                <li>• When found, we automatically reschedule for you</li>
                <li>• You'll receive instant notifications</li>
                <li>• Both consulate and biometrics appointments are handled</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Start Monitoring"}
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
