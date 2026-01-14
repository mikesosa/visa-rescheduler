const moment = require("moment");
const axios = require("axios").default;
const { Builder, By, Key, until } = require("selenium-webdriver");

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

const rescheduler = async (email, password, currentDate, scheduleId, facilityId = 25) => {
  const USERNAME = email;
  const PASSWORD = password;
  const SCHEDULE_ID = scheduleId;
  const MY_SCHEDULE_DATE = currentDate;
  const COUNTRY_CODE = "es-co";
  const REGEX_CONTINUE = "//a[contains(text(),'Continuar')]";
  const FACILITY_ID = facilityId;
  const RETRY_INTERVAL_MS = 60000; // 1 minute
  const DATE_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/days/${FACILITY_ID}.json?&consulate_id=${FACILITY_ID}&consulate_date=&consulate_time=&appointments[expedite]=false`;
  const LOGIN_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/users/sign_in`;
  const TIME_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/times/${FACILITY_ID}.json?date=::date::&consulate_id=${FACILITY_ID}&appointments[expedite]=false`;
  const APPOINTMENT_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment`;
  const PUSH_URL = "https://api.pushover.net/1/messages.json";
  const PUSH_TOKEN = "akdhcemcyhgbv8xz7j6a8e582ct7ok";
  const PUSH_USER = "u86nkp3b1y56opwrfzxwrznf8g5qjp";
  const MAX_RETRIES = 10;

  const driver = new Builder().forBrowser("chrome").build();

  // Logging helper with timestamp
  const log = (message, color = colors.reset) => {
    const timestamp = moment().format("HH:mm:ss");
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`
    );
  };

  const logSuccess = (msg) => log(`✓ ${msg}`, colors.green);
  const logInfo = (msg) => log(`→ ${msg}`, colors.cyan);
  const logWarn = (msg) => log(`⚠ ${msg}`, colors.yellow);
  const logError = (msg) => log(`✗ ${msg}`, colors.red);
  const logHighlight = (msg) => log(`★ ${msg}`, colors.magenta + colors.bright);

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const sendNotification = async (msg) => {
    await axios
      .post(PUSH_URL, {
        token: PUSH_TOKEN,
        user: PUSH_USER,
        message: msg,
      })
      .then((res) => {
        logSuccess("Push notification sent");
      })
      .catch((err) => {
        logError(`Push notification failed: ${err.message}`);
      });
  };

  const login = async () => {
    try {
      log("─".repeat(50));
      logInfo("Starting login process...");
      await driver.get(LOGIN_URL);
      const a = await driver.findElement(By.xpath('//a[@class="down-arrow bounce"]'));
      await a.click();

      logInfo("Entering credentials...");
      const user = await driver.findElement(By.id("user_email"));
      await user.sendKeys(USERNAME);
      const pwd = await driver.findElement(By.id("user_password"));
      await pwd.sendKeys(PASSWORD);

      await sleep(2000);
      const box = await driver.findElement(By.className("icheckbox"));
      await box.click();

      logInfo("Submitting login...");
      const btn = await driver.findElement(By.name("commit"));
      await btn.click();

      const continueBtn = By.xpath(REGEX_CONTINUE);
      await driver.wait(until.elementLocated(continueBtn), 10000);
      logSuccess("Login successful!");
      log("─".repeat(50));

      // Show config summary
      logInfo(`Schedule ID: ${SCHEDULE_ID}`);
      logInfo(`Facility ID: ${FACILITY_ID}`);
      logInfo(`Current appointment: ${MY_SCHEDULE_DATE}`);
      logInfo(`Check interval: ${RETRY_INTERVAL_MS / 1000} seconds`);
      log("─".repeat(50));

      startRescheduling();
    } catch (error) {
      logError(`Login failed: ${error.message}`);
    }
  };

  const getAvailableDates = async () => {
    // Use JavaScript fetch within browser context to make AJAX request with proper headers
    const result = await driver.executeScript(`
      return fetch("${DATE_URL}", {
        method: "GET",
        headers: {
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "same-origin"
      }).then(r => r.json()).catch(e => ({ error: e.message }));
    `);

    if (result.error) {
      throw new Error(`API error: ${result.error}`);
    }

    if (!result.length) {
      throw new Error("No dates returned from API");
    }

    logInfo(`Found ${result.length} total dates from API`);
    return result;
  };

  const getTime = async (date) => {
    logInfo(`Fetching available times for ${date}...`);
    const timeUrl = TIME_URL.replace("::date::", date);
    const result = await driver.executeScript(`
      return fetch("${timeUrl}", {
        method: "GET",
        headers: {
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "same-origin"
      }).then(r => r.json()).catch(e => ({ error: e.message }));
    `);

    if (result.error) {
      throw new Error(`Time API error: ${result.error}`);
    }

    const times = result.available_times;
    if (!times || !times.length) {
      throw new Error("No times available for this date");
    }
    logSuccess(`Found time slot: ${times[0]}`);
    return times[0];
  };

  const handleReschedule = async (date) => {
    log("─".repeat(50));
    logHighlight(`EARLIER DATE FOUND: ${date.date}`);
    log("─".repeat(50));

    const time = await getTime(date.date);

    logInfo("Preparing reschedule request...");
    await driver.get(APPOINTMENT_URL);
    await sleep(2000);

    const payload = {
      utf8: await driver.findElement(By.name("utf8")).getAttribute("value"),
      authenticity_token: await driver
        .findElement(By.name("authenticity_token"))
        .getAttribute("value"),
      confirmed_limit_message: await driver
        .findElement(By.name("confirmed_limit_message"))
        .getAttribute("value"),
      use_consulate_appointment_capacity: await driver
        .findElement(By.name("use_consulate_appointment_capacity"))
        .getAttribute("value"),
      "appointments[consulate_appointment][facility_id]": FACILITY_ID,
      "appointments[consulate_appointment][date]": date.date,
      "appointments[consulate_appointment][time]": time,
    };
    const cookie = await driver.manage().getCookie("_yatri_session");
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36",
      Referer: APPOINTMENT_URL,
      Cookie: `_yatri_session=${cookie.value}`,
    };

    logInfo(`Rescheduling to: ${date.date} at ${time}`);
    await sendNotification(`Attempting reschedule to ${date.date} at ${time}`);

    await axios
      .post(APPOINTMENT_URL, {
        headers,
        data: payload,
      })
      .then((res) => {
        logSuccess(`Reschedule request sent!`);
        sendNotification(`Reschedule submitted: ${date.date} at ${time}`);
      })
      .catch((err) => {
        logError(`Reschedule failed: ${err.message}`);
        sendNotification(`Reschedule error: ${err.message}`);
      });
  };

  const startRescheduling = async () => {
    let counter = 1;
    // Navigate to appointment page first to establish proper context for AJAX requests
    logInfo("Navigating to appointment page...");
    await driver.get(APPOINTMENT_URL);
    await sleep(2000);

    log("");
    logHighlight("Starting appointment monitor...");
    log(
      `Looking for dates earlier than: ${colors.bright}${MY_SCHEDULE_DATE}${colors.reset}`
    );
    log("");

    while (1) {
      try {
        logInfo(`Check #${counter} - Fetching available dates...`);

        const dates = await getAvailableDates();

        // Show the 3 earliest available dates
        const top3 = dates.slice(0, 3);
        log(`   Earliest 3 dates available:`, colors.gray);
        top3.forEach((d, i) => {
          const dateStr = d.date;
          const daysUntil = moment(dateStr).diff(moment(), "days");
          const comparison = moment(dateStr).isBefore(moment(MY_SCHEDULE_DATE), "day")
            ? `${colors.green}← EARLIER!${colors.reset}`
            : `${colors.gray}(${daysUntil} days away)${colors.reset}`;
          log(`   ${i + 1}. ${colors.bright}${dateStr}${colors.reset} ${comparison}`);
        });

        const validDates = dates.filter(({ date }) => {
          return moment(date).isBefore(moment(MY_SCHEDULE_DATE), "day");
        });

        if (validDates.length) {
          logHighlight(`Found ${validDates.length} earlier date(s)!`);
          const closestDate = validDates[0];
          await sendNotification(`VISA: Earlier date found! ${closestDate.date}`);
          return handleReschedule(closestDate);
        } else {
          logWarn(`No dates earlier than your appointment (${MY_SCHEDULE_DATE})`);
          const nextCheck = moment().add(RETRY_INTERVAL_MS, "ms").format("HH:mm:ss");
          log(`   Next check at ${nextCheck}`, colors.gray);
        }
      } catch (error) {
        logError(error.message);
        const nextCheck = moment().add(RETRY_INTERVAL_MS, "ms").format("HH:mm:ss");
        log(`   Retrying at ${nextCheck}`, colors.gray);
      }

      counter += 1;
      await sleep(RETRY_INTERVAL_MS);
    }
  };

  try {
    log("");
    log("╔════════════════════════════════════════════════╗");
    log("║     US VISA APPOINTMENT RESCHEDULER            ║");
    log("╚════════════════════════════════════════════════╝");
    log("");
    await login();
  } catch (error) {
    logError(`Fatal error: ${error.message}`);
  }
};

module.exports = { rescheduler };
