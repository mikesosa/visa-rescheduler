"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Job {
  id: string;
  visaEmail: string;
  currentDate: string;
  scheduleId: string;
  facilityId: string;
  status: string;
  lastCheck?: string;
  lastMessage?: string;
  successDate?: string;
  successTime?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobLogs, setSelectedJobLogs] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsJobId, setLogsJobId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchJobs();
      const interval = setInterval(fetchJobs, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [status]);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this monitoring job?")) {
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setJobs(jobs.filter((job) => job.id !== jobId));
      }
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  const handleViewLogs = async (jobId: string) => {
    setLogsJobId(jobId);
    setLogsLoading(true);
    setSelectedJobLogs(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/logs`);
      if (res.ok) {
        const data = await res.json();
        setSelectedJobLogs(data.logs);
      } else {
        setSelectedJobLogs("Error loading logs");
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setSelectedJobLogs("Error loading logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const closeLogs = () => {
    setSelectedJobLogs(null);
    setLogsJobId(null);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800";
      case "success":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">Visa Rescheduler</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">{session?.user?.email}</span>
            <button
              onClick={() => router.push("/api/auth/signout")}
              className="text-gray-600 hover:text-gray-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Your Monitoring Jobs</h2>
            <p className="text-gray-600 mt-2">
              {jobs.length === 0 ? "No active jobs" : `${jobs.length} job(s) running`}
            </p>
          </div>
          <Link
            href="/dashboard/new"
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            + New Monitoring Job
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Monitoring Jobs Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first job to start monitoring for earlier visa appointments
            </p>
            <Link
              href="/dashboard/new"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
            >
              Create Your First Job
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Schedule ID: {job.scheduleId}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Monitoring for: {job.visaEmail}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      job.status
                    )}`}
                  >
                    {job.status}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Current Appointment</p>
                    <p className="font-medium">{job.currentDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Facility ID</p>
                    <p className="font-medium">{job.facilityId}</p>
                  </div>
                  {job.lastCheck && (
                    <div>
                      <p className="text-sm text-gray-600">Last Check</p>
                      <p className="font-medium">
                        {new Date(job.lastCheck).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {job.successDate && (
                    <div>
                      <p className="text-sm text-gray-600">Rescheduled To</p>
                      <p className="font-medium text-success-600">
                        {job.successDate} at {job.successTime}
                      </p>
                    </div>
                  )}
                </div>

                {job.lastMessage && (
                  <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                    <p className="text-gray-700">{job.lastMessage.substring(0, 200)}...</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleViewLogs(job.id)}
                    className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 font-medium"
                  >
                    View Logs
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Logs Modal */}
      {logsJobId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-900">
                Job Logs - {jobs.find(j => j.id === logsJobId)?.scheduleId}
              </h3>
              <button
                onClick={closeLogs}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600">Loading logs...</span>
                </div>
              ) : (
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono whitespace-pre-wrap">
                  {selectedJobLogs || "No logs available"}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-6 border-t bg-gray-50">
              <button
                onClick={() => handleViewLogs(logsJobId)}
                disabled={logsLoading}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                🔄 Refresh
              </button>
              <button
                onClick={closeLogs}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
