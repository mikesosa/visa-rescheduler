const { rescheduler } = require("./rescheduler");

try {
  const email = process.argv[2];
  const password = process.argv[3];
  const currentDate = process.argv[4];
  const scheduleId = process.argv[5];
  const facilityId = process.argv[6] || 25; // Default to 25 (Bogota)
  const notEarlierThan = process.argv[7] || null; // Optional: minimum date (e.g., 2026-01-22)

  if (!email || !password || !currentDate || !scheduleId) {
    console.log(`
Usage: node index.js <email> <password> <current-date> <schedule-id> [facility-id] [not-earlier-than]

Arguments:
  email            Your login email
  password         Your password (wrap in single quotes if it has special chars)
  current-date     Your current appointment date (YYYY-MM-DD)
  schedule-id      Your schedule ID from the URL
  facility-id      (Optional) Consulate facility ID, default: 25 (Bogota)
  not-earlier-than (Optional) Don't book before this date (YYYY-MM-DD)

Example:
  node index.js user@email.com 'MyP@ss!' 2026-10-08 72409682
  node index.js user@email.com 'MyP@ss!' 2026-10-08 72409682 25 2026-01-22
    `);
    process.exit(1);
  }

  rescheduler(email, password, currentDate, scheduleId, facilityId, notEarlierThan);
} catch (error) {
  console.log("Error: ", error);
}
