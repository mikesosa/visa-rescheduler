"use client";

import { useState, useEffect } from "react";
import { encrypt } from "@/lib/encryption";

interface Job {
  id: string;
  visaEmail: string;
  currentDate: string;
  scheduleId: string;
  facilityId: string;
  notEarlierThan?: string;
}

interface EditJobModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditJobModal({ job, isOpen, onClose, onSuccess }: EditJobModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    visaEmail: "",
    visaPassword: "",
    currentDate: "",
    scheduleId: "",
    facilityId: "25",
    notEarlierThan: "",
  });

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      setFormData({
        visaEmail: job.visaEmail,
        visaPassword: "", // Never pre-fill password
        currentDate: job.currentDate,
        scheduleId: job.scheduleId,
        facilityId: job.facilityId || "25",
        notEarlierThan: job.notEarlierThan || "",
      });
      setError("");
    }
  }, [job]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const updatePayload: any = {
        visaEmail: formData.visaEmail,
        currentDate: formData.currentDate,
        scheduleId: formData.scheduleId,
        facilityId: formData.facilityId,
        notEarlierThan: formData.notEarlierThan,
      };

      // Only include password if it was changed
      if (formData.visaPassword) {
        updatePayload.visaPassword = formData.visaPassword;
      }

      const res = await fetch(`/api/jobs/${job?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update job");
      }
    } catch (error) {
      console.error("Error updating job:", error);
      setError("An error occurred while updating the job");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-2xl font-semibold text-gray-900">Edit Monitoring Job</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Visa Email */}
            <div>
              <label htmlFor="visaEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Visa Account Email *
              </label>
              <input
                type="email"
                id="visaEmail"
                required
                value={formData.visaEmail}
                onChange={(e) => setFormData({ ...formData, visaEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                placeholder="your.email@example.com"
              />
            </div>

            {/* Visa Password */}
            <div>
              <label htmlFor="visaPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Visa Account Password
              </label>
              <input
                type="password"
                id="visaPassword"
                value={formData.visaPassword}
                onChange={(e) => setFormData({ ...formData, visaPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                placeholder="Leave blank to keep current"
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
            </div>

            {/* Current Appointment Date */}
            <div>
              <label htmlFor="currentDate" className="block text-sm font-medium text-gray-700 mb-1">
                Current Appointment Date *
              </label>
              <input
                type="date"
                id="currentDate"
                required
                value={formData.currentDate}
                onChange={(e) => setFormData({ ...formData, currentDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Schedule ID */}
            <div>
              <label htmlFor="scheduleId" className="block text-sm font-medium text-gray-700 mb-1">
                Schedule ID *
              </label>
              <input
                type="text"
                id="scheduleId"
                required
                value={formData.scheduleId}
                onChange={(e) => setFormData({ ...formData, scheduleId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                placeholder="e.g., 72409682"
              />
            </div>

            {/* Facility ID */}
            <div>
              <label htmlFor="facilityId" className="block text-sm font-medium text-gray-700 mb-1">
                Facility ID
              </label>
              <select
                id="facilityId"
                value={formData.facilityId}
                onChange={(e) => setFormData({ ...formData, facilityId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option value="25">Bogotá (25)</option>
                <option value="26">Other Facility</option>
              </select>
            </div>

            {/* Not Earlier Than */}
            <div>
              <label htmlFor="notEarlierThan" className="block text-sm font-medium text-gray-700 mb-1">
                Don't Book Earlier Than (Optional)
              </label>
              <input
                type="date"
                id="notEarlierThan"
                value={formData.notEarlierThan}
                onChange={(e) => setFormData({ ...formData, notEarlierThan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Only reschedule to dates on or after this</p>
            </div>

            {/* Info Banner */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> If the job is currently active, it will be restarted with
                the new parameters.
              </p>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Updating..." : "Update Job"}
          </button>
        </div>
      </div>
    </div>
  );
}
