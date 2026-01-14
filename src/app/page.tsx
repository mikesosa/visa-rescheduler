import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">Visa Rescheduler</h1>
          <div className="space-x-4">
            <Link
              href="/login"
              className="text-gray-700 hover:text-primary-600 font-medium"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-extrabold text-gray-900 sm:text-6xl">
            Never Miss an Earlier
            <span className="text-primary-600"> Visa Appointment</span>
          </h2>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Automatically monitor and reschedule your US visa appointments to earlier dates.
            Save time and secure your appointment faster with our intelligent monitoring service.
          </p>
          <div className="mt-10">
            <Link
              href="/signup"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 inline-block shadow-lg hover:shadow-xl transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-32">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-16">
            How It Works
          </h3>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h4 className="text-xl font-semibold mb-3">Connect Your Account</h4>
              <p className="text-gray-600">
                Securely link your visa appointment account. All credentials are encrypted.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h4 className="text-xl font-semibold mb-3">We Monitor 24/7</h4>
              <p className="text-gray-600">
                Our system checks for earlier appointments every minute, faster than any human.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h4 className="text-xl font-semibold mb-3">Auto Reschedule</h4>
              <p className="text-gray-600">
                When an earlier slot opens, we automatically reschedule for you instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 bg-white rounded-2xl shadow-xl p-12">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Us
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="text-success-500 text-2xl">✓</div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Lightning Fast</h4>
                <p className="text-gray-600">Checks every 60 seconds, faster than manual monitoring</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-success-500 text-2xl">✓</div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Secure & Private</h4>
                <p className="text-gray-600">Bank-level encryption for all your credentials</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-success-500 text-2xl">✓</div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Smart Scheduling</h4>
                <p className="text-gray-600">Handles both consulate and biometrics appointments</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-success-500 text-2xl">✓</div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Real-time Alerts</h4>
                <p className="text-gray-600">Get notified immediately when dates are found</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-32 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to Secure Your Appointment?
          </h3>
          <Link
            href="/signup"
            className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 inline-block shadow-lg"
          >
            Start Monitoring Now
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-32 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2026 Visa Rescheduler. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
