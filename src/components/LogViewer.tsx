"use client";

interface LogViewerProps {
  logs: string;
}

export default function LogViewer({ logs }: LogViewerProps) {
  // Clean and format logs
  const formatLogs = (text: string): JSX.Element[] => {
    if (!text)
      return [
        <div key="empty" className="text-gray-500">
          No logs available yet
        </div>,
      ];

    // Remove ANSI codes for now (we'll add proper color support)
    const cleanText = text.replace(/\x1b\[[0-9;]*m/g, "");

    const lines = cleanText.split("\n");

    return lines
      .map((line, index) => {
        if (!line.trim()) return null;

        // Detect log level/type and apply styling
        let className = "text-gray-300";
        let icon = "";

        // Timestamps
        if (line.match(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          className = "text-blue-400";
        }

        // Success indicators
        if (
          line.includes("✅") ||
          line.includes("SUCCESS") ||
          line.includes("successful")
        ) {
          className = "text-green-400";
          icon = "✅ ";
        }

        // Errors
        else if (
          line.includes("[ERROR]") ||
          line.includes("Error:") ||
          line.includes("failed") ||
          line.includes("❌")
        ) {
          className = "text-red-400 font-semibold";
          icon = "❌ ";
        }

        // Warnings
        else if (
          line.includes("⚠") ||
          line.includes("WARNING") ||
          line.includes("warning")
        ) {
          className = "text-yellow-400";
          icon = "⚠️ ";
        }

        // Info/checking
        else if (
          line.includes("🔍") ||
          line.includes("Checking") ||
          line.includes("Starting")
        ) {
          className = "text-cyan-400";
        }

        // Headers/banners (lines with ═ or ║)
        else if (
          line.includes("═") ||
          line.includes("║") ||
          line.includes("╔") ||
          line.includes("╚")
        ) {
          className = "text-purple-400 font-bold";
        }

        // Configuration details
        else if (
          line.includes("📧") ||
          line.includes("📅") ||
          line.includes("🔑") ||
          line.includes("🏢")
        ) {
          className = "text-yellow-300";
        }

        // Login/auth
        else if (line.includes("Login") || line.includes("authenticated")) {
          className = "text-green-300";
        }

        // Dates found
        else if (line.includes("earlier date") || line.includes("Available dates")) {
          className = "text-green-400 font-semibold";
          icon = "🎯 ";
        }

        // Process control
        else if (line.includes("Process exited") || line.includes("Stopping")) {
          className = "text-gray-400";
        }

        return (
          <div
            key={index}
            className={`${className} py-0.5 hover:bg-gray-800 px-2 -mx-2 rounded transition-colors`}
          >
            {icon && <span className="mr-1">{icon}</span>}
            {line}
          </div>
        );
      })
      .filter(Boolean) as JSX.Element[];
  };

  const formattedLines = formatLogs(logs);

  return (
    <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[60vh] border border-gray-700">
      <div className="text-sm font-mono leading-relaxed space-y-0.5">
        {formattedLines.length > 0 ? (
          formattedLines
        ) : (
          <div className="text-gray-500 text-center py-8">No logs available yet</div>
        )}
      </div>
    </div>
  );
}
