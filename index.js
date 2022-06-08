const { rescheduler } = require("./rescheduler");

try {
  const email = process.argv[2];
  const password = process.argv[3];
  const currentDate = process.argv[4];
  const scheduleId = process.argv[5];
  rescheduler(email, password, currentDate, scheduleId);
} catch (error) {
  console.log("Error: ", error);
}
