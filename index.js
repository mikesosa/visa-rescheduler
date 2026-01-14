const { rescheduler } = require("./rescheduler");

try {
  const email = process.argv[2];
  const password = process.argv[3];
  const currentDate = process.argv[4];
  const scheduleId = process.argv[5];
  const facilityId = process.argv[6] || 25; // Default to 25 (Bogota)
  rescheduler(email, password, currentDate, scheduleId, facilityId);
} catch (error) {
  console.log("Error: ", error);
}
