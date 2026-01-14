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
    </div>
  );
}
