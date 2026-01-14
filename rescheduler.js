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

  // Play sound using macOS system sounds
  const { exec } = require("child_process");

  // Alert sound - quick pings to get attention (dates found)
  const playAlertSound = () => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        exec("afplay /System/Library/Sounds/Ping.aiff");
      }, i * 300);
    }
  };

  // Success sound - celebratory (rescheduled successfully)
  const playSuccessSound = () => {
    // Play Hero sound for big success
    exec("afplay /System/Library/Sounds/Hero.aiff");
    setTimeout(() => {
      exec("afplay /System/Library/Sounds/Glass.aiff");
    }, 500);
    setTimeout(() => {
      exec("afplay /System/Library/Sounds/Hero.aiff");
    }, 1000);
  };

  // Error sound - low tones for failures
  const playErrorSound = () => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        exec("afplay /System/Library/Sounds/Basso.aiff");
      }, i * 700);
    }
  };

  // Alert with sound and visual emphasis
  const alertFound = () => {
    playAlertSound(); // Quick pings to get attention
    console.log("\n" + colors.bright + colors.green);
    console.log("  🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
    console.log("  🎉  EARLIER DATE FOUND! CHECK TERMINAL!  🎉");
    console.log("  🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
    console.log(colors.reset + "\n");
  };

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  // Optional push notification - disabled by default
  // Set PUSH_ENABLED = true and add your Pushover tokens to enable
  const PUSH_ENABLED = false;

  const sendNotification = async (msg) => {
    if (!PUSH_ENABLED) return;

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

  // Try to reschedule to one of the given dates (tries each until one works)
  const handleReschedule = async (validDates) => {
    // Try up to 10 earlier dates (more chances since many will have no times)
    const datesToTry = validDates.slice(0, 10);

    for (let i = 0; i < datesToTry.length; i++) {
      const date = datesToTry[i];
      log("─".repeat(50));
      logHighlight(`TRYING DATE ${i + 1}/${datesToTry.length}: ${date.date}`);
      log("─".repeat(50));

      try {
        // FAST CHECK: Verify times are available via API BEFORE UI interaction
        logInfo(`Checking if times available for ${date.date}...`);
        const timeCheckUrl = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/times/${FACILITY_ID}.json?date=${date.date}&consulate_id=${FACILITY_ID}&appointments[expedite]=false`;
        const timesCheck = await driver.executeScript(`
          return fetch("${timeCheckUrl}", {
            method: "GET",
            headers: {
              "Accept": "application/json, text/javascript, */*; q=0.01",
              "X-Requested-With": "XMLHttpRequest"
            },
            credentials: "same-origin"
          }).then(r => r.json()).catch(e => ({ error: e.message }));
        `);

        if (!timesCheck.available_times || timesCheck.available_times.length === 0) {
          logWarn(`No times for ${date.date} (already taken), skipping...`);
          continue; // Skip to next date immediately - no UI interaction needed!
        }

        const availableTime = timesCheck.available_times[0];
        logSuccess(
          `Times available! First slot: ${availableTime} (${timesCheck.available_times.length} total)`
        );

        logInfo("Navigating to reschedule page...");
        await driver.get(APPOINTMENT_URL);
        await sleep(3000);

        // Select the facility/consulate from dropdown
        logInfo("Selecting consulate...");
        const facilityDropdown = await driver.findElement(
          By.id("appointments_consulate_appointment_facility_id")
        );
        await facilityDropdown.click();
        await sleep(500);
        const facilityOption = await driver.findElement(
          By.css(
            `#appointments_consulate_appointment_facility_id option[value="${FACILITY_ID}"]`
          )
        );
        await facilityOption.click();
        await sleep(2000);

        // Use jQuery UI Datepicker API to properly set the date and trigger time slot loading
        logInfo(`Setting date: ${date.date} via datepicker...`);

        // First, let's see what the current date value is
        const beforeDate = await driver.executeScript(`
          return document.getElementById('appointments_consulate_appointment_date').value;
        `);
        logInfo(`Date field BEFORE: "${beforeDate}"`);

        // Try setting the date using jQuery datepicker
        await driver.executeScript(`
          const dateInput = $('#appointments_consulate_appointment_date');
          dateInput.datepicker('setDate', '${date.date}');
          dateInput.trigger('change');
          dateInput.trigger('blur');
        `);
        await sleep(1000);

        // Check what the date field shows now
        const afterDate = await driver.executeScript(`
          return document.getElementById('appointments_consulate_appointment_date').value;
        `);
        logInfo(`Date field AFTER: "${afterDate}"`);

        // If datepicker didn't work, try clicking the date in the calendar
        if (!afterDate || afterDate === beforeDate) {
          logWarn("Datepicker setDate didn't work, trying to click on calendar...");

          // Click on the date input to open calendar
          const dateInputEl = await driver.findElement(
            By.id("appointments_consulate_appointment_date")
          );
          await dateInputEl.click();
          await sleep(1000);

          // Look for the date in the calendar and click it
          // The datepicker has format like data-month="8" data-year="2026" for September
          const [year, month, day] = date.date.split("-");
          const monthIndex = parseInt(month) - 1; // 0-indexed
          const dayNum = parseInt(day);

          logInfo(
            `Looking for calendar day: ${dayNum} in month ${monthIndex}, year ${year}`
          );

          try {
            // Find clickable day in the datepicker
            const daySelector = `td[data-month="${monthIndex}"][data-year="${year}"] a:contains("${dayNum}")`;
            await driver.executeScript(`
              // Find the day cell and click it
              const cells = document.querySelectorAll('#ui-datepicker-div td[data-handler="selectDay"]');
              for (const cell of cells) {
                if (cell.dataset.month === "${monthIndex}" && cell.dataset.year === "${year}") {
                  const dayLink = cell.querySelector('a');
                  if (dayLink && dayLink.textContent === "${dayNum}") {
                    dayLink.click();
                    break;
                  }
                }
              }
            `);
            await sleep(2000);
          } catch (e) {
            logWarn(`Could not click calendar day: ${e.message}`);
          }

          // Check date field again
          const finalDate = await driver.executeScript(`
            return document.getElementById('appointments_consulate_appointment_date').value;
          `);
          logInfo(`Date field FINAL: "${finalDate}"`);
        }

        await sleep(1000); // Brief wait

        // FAST PATH: Instead of waiting for UI to load times, inject the time directly!
        // We already know the available time from the API check
        logInfo(`Injecting time ${availableTime} directly into dropdown...`);

        await driver.executeScript(`
          const timeSelect = document.getElementById('appointments_consulate_appointment_time');
          // Clear existing options
          timeSelect.innerHTML = '<option value=""></option>';
          // Add our known time
          const option = document.createElement('option');
          option.value = '${availableTime}';
          option.text = '${availableTime}';
          option.selected = true;
          timeSelect.appendChild(option);
          // Trigger change event
          timeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        `);

        await sleep(500);
        const selectedTime = availableTime;
        logSuccess(`Injected time: ${selectedTime}`);

        // Log the current state of ASC section before submitting
        logInfo("Checking ASC appointment section...");
        const ascInfo = await driver.executeScript(`
          const ascSection = document.getElementById('asc-appointment-fields');
          const ascFacility = document.getElementById('appointments_asc_appointment_facility_id');
          const ascDate = document.getElementById('appointments_asc_appointment_date');
          const ascTime = document.getElementById('appointments_asc_appointment_time');
          const ascDateTimeDiv = document.getElementById('asc_date_time');
          
          return {
            ascSectionVisible: ascSection ? ascSection.offsetParent !== null : false,
            ascDateTimeDivStyle: ascDateTimeDiv ? ascDateTimeDiv.style.display : 'not found',
            ascFacility: ascFacility ? {
              value: ascFacility.value,
              disabled: ascFacility.disabled,
              options: Array.from(ascFacility.options).map(o => ({value: o.value, text: o.text, selected: o.selected}))
            } : null,
            ascDate: ascDate ? {
              value: ascDate.value,
              disabled: ascDate.disabled,
              readOnly: ascDate.readOnly
            } : null,
            ascTime: ascTime ? {
              value: ascTime.value,
              disabled: ascTime.disabled,
              optionsCount: ascTime.options.length,
              options: Array.from(ascTime.options).slice(0, 5).map(o => ({value: o.value, text: o.text}))
            } : null,
            submitBtn: document.getElementById('appointments_submit')?.disabled
          };
        `);

        log("ASC Section State:");
        console.log(JSON.stringify(ascInfo, null, 2));

        // Save HTML for debugging ASC section
        const fs = require("fs");
        const debugHtml = await driver.getPageSource();
        const debugFile = `debug-asc-${Date.now()}.html`;
        fs.writeFileSync(debugFile, debugHtml);
        logInfo(`Full HTML saved to: ${debugFile}`);

        // Click the submit/reschedule button
        logInfo("Submitting reschedule...");
        const submitBtn = await driver.findElement(By.id("appointments_submit"));
        await submitBtn.click();
        await sleep(3000);

        // Check for confirmation or success message
        const pageSource = await driver.getPageSource();
        if (
          pageSource.includes("Successfully") ||
          pageSource.includes("successfully") ||
          pageSource.includes("exitosamente")
        ) {
          playSuccessSound(); // Celebratory sound!
          logSuccess(`🎉 RESCHEDULED SUCCESSFULLY to ${date.date} at ${selectedTime}!`);
          await sendNotification(
            `✅ RESCHEDULED! New date: ${date.date} at ${selectedTime}`
          );
          return true; // Success!
        } else {
          logWarn("Reschedule submitted - please verify in browser");
          await sendNotification(
            `Reschedule attempted: ${date.date} at ${selectedTime} - please verify`
          );
          return true; // Probably success, user should verify
        }
      } catch (error) {
        logError(`Error with date ${date.date}: ${error.message}`);
        // Continue to next date
      }
    }

    // If we get here, none of the dates worked
    playErrorSound(); // Play error sound
    logError("Could not reschedule to any of the earlier dates");

    // Save debug info
    try {
      const pageSource = await driver.getPageSource();
      const fs = require("fs");
      const filename = `debug-${Date.now()}.html`;
      fs.writeFileSync(filename, pageSource);
      logInfo(`Debug HTML saved to: ${filename}`);
    } catch (e) {}

    return false;
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
          const daysDiff = moment(dateStr).diff(moment(MY_SCHEDULE_DATE), "days");
          let comparison;
          if (daysDiff < 0) {
            comparison = `${colors.green}← ${Math.abs(daysDiff)} days EARLIER!${
              colors.reset
            }`;
          } else if (daysDiff === 0) {
            comparison = `${colors.yellow}(same day)${colors.reset}`;
          } else {
            comparison = `${colors.gray}(${daysDiff} days later)${colors.reset}`;
          }
          log(`   ${i + 1}. ${colors.bright}${dateStr}${colors.reset} ${comparison}`);
        });

        const validDates = dates.filter(({ date }) => {
          return moment(date).isBefore(moment(MY_SCHEDULE_DATE), "day");
        });

        if (validDates.length) {
          alertFound(); // 🔔 Sound the alarm!
          logHighlight(`Found ${validDates.length} earlier date(s)!`);
          // Try each earlier date until one succeeds
          const success = await handleReschedule(validDates);
          if (success) return; // Successfully rescheduled, exit
          logWarn("Could not reschedule to any earlier date, will keep trying...");
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
