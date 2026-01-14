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

        // Wait for the page to fully load by checking for the facility dropdown
        logInfo("Waiting for page to load...");
        try {
          await driver.wait(
            until.elementLocated(By.id("appointments_consulate_appointment_facility_id")),
            15000
          );
        } catch (e) {
          logError("Page failed to load - facility dropdown not found");
          // Save debug HTML
          const fs = require("fs");
          fs.writeFileSync(
            `debug-pageload-${Date.now()}.html`,
            await driver.getPageSource()
          );
          throw new Error("Page failed to load");
        }
        await sleep(1000);

        // Select the facility/consulate from dropdown
        logInfo("Selecting consulate...");
        const facilityDropdown = await driver.findElement(
          By.id("appointments_consulate_appointment_facility_id")
        );
        await driver.executeScript(
          "arguments[0].scrollIntoView(true);",
          facilityDropdown
        );
        await sleep(500);
        await facilityDropdown.click();
        await sleep(500);
        const facilityOption = await driver.findElement(
          By.css(
            `#appointments_consulate_appointment_facility_id option[value="${FACILITY_ID}"]`
          )
        );
        await facilityOption.click();
        await sleep(2000);

        // Wait for date field to be available (it's readonly, so we check if it exists)
        logInfo(`Opening datepicker for ${date.date}...`);
        await sleep(500);

        // Click the calendar icon to open datepicker (date input is readonly)
        try {
          const calendarIcon = await driver.findElement(
            By.css("#appointments_consulate_appointment_date_input .calendar_icon")
          );
          await driver.executeScript(
            "arguments[0].scrollIntoView({block: 'center'});",
            calendarIcon
          );
          await sleep(300);
          await calendarIcon.click();
          await sleep(1000);
        } catch (iconError) {
          logWarn("Calendar icon click failed, trying jQuery approach...");
          await driver.executeScript(`
            $('#appointments_consulate_appointment_date').datepicker('show');
          `);
          await sleep(1000);
        }

        // Verify datepicker opened
        const datepickerVisible = await driver.executeScript(`
          const dp = document.getElementById('ui-datepicker-div');
          return dp && dp.style.display !== 'none' && dp.offsetParent !== null;
        `);

        if (!datepickerVisible) {
          logWarn("Datepicker still not visible, forcing show...");
          await driver.executeScript(`
            $('#appointments_consulate_appointment_date').datepicker('show');
          `);
          await sleep(1000);
        }

        logInfo("Datepicker opened: " + (datepickerVisible ? "yes" : "forcing..."));

        // Parse the target date
        const [year, month, day] = date.date.split("-");
        const targetYear = parseInt(year);
        const targetMonth = parseInt(month) - 1; // 0-indexed
        const targetDay = parseInt(day);

        // Navigate to the correct month/year in the datepicker
        logInfo(`Navigating to ${month}/${year} in calendar...`);

        // Keep clicking next/prev until we reach the target month
        let attempts = 0;
        while (attempts < 24) {
          // Max 2 years of navigation
          const currentMonthYear = await driver.executeScript(`
            const header = document.querySelector('#ui-datepicker-div .ui-datepicker-title');
            const monthSpan = document.querySelector('#ui-datepicker-div .ui-datepicker-month');
            const yearSpan = document.querySelector('#ui-datepicker-div .ui-datepicker-year');
            return {
              month: monthSpan ? monthSpan.textContent : '',
              year: yearSpan ? yearSpan.textContent : '',
              visible: document.querySelector('#ui-datepicker-div') && 
                       document.querySelector('#ui-datepicker-div').style.display !== 'none'
            };
          `);

          if (!currentMonthYear.visible) {
            logWarn("Datepicker closed unexpectedly, reopening...");
            await driver.executeScript(`
              $('#appointments_consulate_appointment_date').datepicker('show');
            `);
            await sleep(500);
            continue;
          }

          const currentYear = parseInt(currentMonthYear.year);
          // English and Spanish month names
          const monthNamesEn = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ];
          const monthNamesEs = [
            "Enero",
            "Febrero",
            "Marzo",
            "Abril",
            "Mayo",
            "Junio",
            "Julio",
            "Agosto",
            "Septiembre",
            "Octubre",
            "Noviembre",
            "Diciembre",
          ];

          let currentMonthIndex = monthNamesEn.findIndex((m) =>
            currentMonthYear.month.toLowerCase().includes(m.toLowerCase().substring(0, 3))
          );
          if (currentMonthIndex === -1) {
            currentMonthIndex = monthNamesEs.findIndex((m) =>
              currentMonthYear.month
                .toLowerCase()
                .includes(m.toLowerCase().substring(0, 3))
            );
          }

          if (currentYear === targetYear && currentMonthIndex === targetMonth) {
            break; // Found the right month
          }

          // Need to navigate
          const needsNext =
            currentYear < targetYear ||
            (currentYear === targetYear && currentMonthIndex < targetMonth);

          if (needsNext) {
            await driver.executeScript(`
              document.querySelector('#ui-datepicker-div .ui-datepicker-next').click();
            `);
          } else {
            await driver.executeScript(`
              document.querySelector('#ui-datepicker-div .ui-datepicker-prev').click();
            `);
          }
          await sleep(300);
          attempts++;
        }

        // Now click on the specific day
        logInfo(`Clicking on day ${targetDay}...`);
        const dayClicked = await driver.executeScript(`
          const targetDay = ${targetDay};
          const cells = document.querySelectorAll('#ui-datepicker-div td[data-handler="selectDay"]');
          for (const cell of cells) {
            const link = cell.querySelector('a');
            if (link && parseInt(link.textContent.trim()) === targetDay) {
              link.click();
              return true;
            }
          }
          return false;
        `);

        if (!dayClicked) {
          logWarn(`Could not find day ${targetDay} in calendar`);
        }

        await sleep(2000); // Wait for times to load via AJAX

        // Check if date was set
        const setDate = await driver.executeScript(`
          return document.getElementById('appointments_consulate_appointment_date').value;
        `);
        logInfo(`Date field now: "${setDate}"`);

        // Wait for time dropdown to populate
        logInfo(`Waiting for time slots...`);
        let timeLoaded = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          const timeCount = await driver.executeScript(`
            return document.getElementById('appointments_consulate_appointment_time').options.length;
          `);
          if (timeCount > 1) {
            timeLoaded = true;
            logSuccess(`Time slots loaded: ${timeCount - 1} options`);
            break;
          }
          await sleep(1000);
        }

        if (!timeLoaded) {
          logWarn(`Times didn't load via UI for ${date.date}, skipping...`);
          continue;
        }

        // Select the first available time
        logInfo(`Selecting first available time...`);
        const selectedTime = await driver.executeScript(`
          const select = document.getElementById('appointments_consulate_appointment_time');
          if (select.options.length > 1) {
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return select.value;
          }
          return null;
        `);

        if (!selectedTime) {
          logWarn(`Could not select time for ${date.date}, skipping...`);
          continue;
        }

        logSuccess(`Selected time: ${selectedTime}`);

        // IMPORTANT: Wait for the site to process consulate selection and activate ASC section
        logInfo("Waiting for site to activate ASC section...");
        await sleep(2000);

        // Wait for ASC section to become visible (site should show it after consulate is selected)
        let ascBecameVisible = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          const ascVisibility = await driver.executeScript(`
            const ascDateTimeDiv = document.getElementById('asc_date_time');
            if (!ascDateTimeDiv) return { exists: false };
            const computed = window.getComputedStyle(ascDateTimeDiv);
            return {
              exists: true,
              display: ascDateTimeDiv.style.display,
              computedDisplay: computed.display,
              visible: computed.display !== 'none'
            };
          `);
          logInfo(
            `ASC visibility check ${attempt + 1}: ${JSON.stringify(ascVisibility)}`
          );
          if (ascVisibility.visible) {
            ascBecameVisible = true;
            logSuccess("ASC section became visible!");
            break;
          }
          await sleep(1000);
        }

        // If ASC didn't become visible naturally, try triggering it
        if (!ascBecameVisible) {
          logWarn("ASC section not visible yet, triggering consulate time change...");
          await driver.executeScript(`
            const consulateTime = document.getElementById('appointments_consulate_appointment_time');
            if (consulateTime) {
              consulateTime.dispatchEvent(new Event('change', { bubbles: true }));
              consulateTime.dispatchEvent(new Event('input', { bubbles: true }));
            }
          `);
          await sleep(2000);
        }

        // Save DOM for debugging ASC section
        const fs = require("fs");
        const debugFile = `debug-after-consulate-${Date.now()}.html`;
        fs.writeFileSync(debugFile, await driver.getPageSource());
        logInfo(`DOM saved to: ${debugFile}`);

        // Handle ASC (Application Support Center / Biometrics) appointment section
        logInfo("Checking ASC appointment section...");

        // Detailed ASC section inspection
        const ascDebugInfo = await driver.executeScript(`
          const ascSection = document.getElementById('asc-appointment-fields');
          const ascDateInput = document.getElementById('appointments_asc_appointment_date');
          const ascFacility = document.getElementById('appointments_asc_appointment_facility_id');
          const ascTime = document.getElementById('appointments_asc_appointment_time');
          const ascDateTimeDiv = document.getElementById('asc_date_time');
          const ascDateInputWrapper = document.getElementById('appointments_asc_appointment_date_input');
          
          return {
            ascSection: ascSection ? {
              exists: true,
              display: window.getComputedStyle(ascSection).display,
              visibility: window.getComputedStyle(ascSection).visibility,
              offsetParent: ascSection.offsetParent !== null,
              className: ascSection.className
            } : { exists: false },
            ascDateInput: ascDateInput ? {
              exists: true,
              disabled: ascDateInput.disabled,
              readOnly: ascDateInput.readOnly,
              value: ascDateInput.value,
              display: window.getComputedStyle(ascDateInput).display,
              offsetParent: ascDateInput.offsetParent !== null,
              className: ascDateInput.className
            } : { exists: false },
            ascDateInputWrapper: ascDateInputWrapper ? {
              exists: true,
              display: window.getComputedStyle(ascDateInputWrapper).display
            } : { exists: false },
            ascDateTimeDiv: ascDateTimeDiv ? {
              exists: true,
              display: ascDateTimeDiv.style.display,
              computedDisplay: window.getComputedStyle(ascDateTimeDiv).display
            } : { exists: false },
            ascFacility: ascFacility ? {
              exists: true,
              value: ascFacility.value,
              disabled: ascFacility.disabled
            } : { exists: false },
            ascTime: ascTime ? {
              exists: true,
              disabled: ascTime.disabled,
              optionsCount: ascTime.options.length
            } : { exists: false }
          };
        `);

        log("ASC Debug Info:");
        console.log(JSON.stringify(ascDebugInfo, null, 2));

        // ASC is ALWAYS required - check if the elements exist
        const ascExists =
          ascDebugInfo.ascDateInput?.exists && ascDebugInfo.ascFacility?.exists;

        logInfo(
          `ASC check: exists=${ascExists}, facility=${ascDebugInfo.ascFacility?.value}`
        );

        if (ascExists) {
          // Force show the ASC date/time div if it's hidden
          logInfo("Forcing ASC date/time section visible...");
          await driver.executeScript(`
            const ascDateTimeDiv = document.getElementById('asc_date_time');
            if (ascDateTimeDiv) {
              ascDateTimeDiv.style.display = 'block';
            }
            // Also ensure the date input wrapper is visible
            const ascDateInputWrapper = document.getElementById('appointments_asc_appointment_date_input');
            if (ascDateInputWrapper) {
              ascDateInputWrapper.style.display = 'list-item';
            }
            // Trigger change on facility to potentially load available dates
            const ascFacility = document.getElementById('appointments_asc_appointment_facility_id');
            if (ascFacility) {
              ascFacility.dispatchEvent(new Event('change', { bubbles: true }));
            }
          `);
          await sleep(1000);
          logInfo("ASC section ready, fetching available ASC dates...");

          // Get ASC facility ID
          const ascFacilityId = ascDebugInfo.ascFacility?.value || "26";

          // Fetch available ASC dates via API
          const ascDatesUrl = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/days/${ascFacilityId}.json?consulate_id=${FACILITY_ID}&consulate_date=${date.date}&consulate_time=${selectedTime}&appointments[expedite]=false`;

          logInfo(`Fetching ASC dates from: ${ascDatesUrl}`);

          const ascDatesResponse = await driver.executeScript(`
            return fetch("${ascDatesUrl}", {
              method: "GET",
              headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "X-Requested-With": "XMLHttpRequest"
              },
              credentials: "include"
            })
            .then(r => {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return r.json();
            })
            .catch(e => ({ error: e.message }));
          `);

          if (ascDatesResponse.error || !ascDatesResponse.length) {
            logWarn(
              `No ASC dates available: ${ascDatesResponse.error || "empty response"}`
            );
          } else {
            logInfo(`Found ${ascDatesResponse.length} ASC dates available`);

            // Log first few ASC dates for debugging
            const firstAscDates = ascDatesResponse.slice(0, 5).map((d) => d.date);
            logInfo(`First ASC dates: ${firstAscDates.join(", ")}`);

            // Just take the first available ASC date (site returns valid dates for the selected consulate date)
            const validAscDates = ascDatesResponse.slice(0, 3);

            if (validAscDates.length > 0) {
              const ascDate = validAscDates[0].date;
              const [ascYear, ascMonth, ascDay] = ascDate.split("-");
              const ascTargetYear = parseInt(ascYear);
              const ascTargetMonth = parseInt(ascMonth) - 1;
              const ascTargetDay = parseInt(ascDay);

              logInfo(`Selecting ASC date: ${ascDate}`);

              // Open ASC datepicker
              await driver.executeScript(`
                $('#appointments_asc_appointment_date').datepicker('show');
              `);
              await sleep(1000);

              // Navigate to the correct month for ASC
              logInfo(`Navigating ASC calendar to ${ascMonth}/${ascYear}...`);
              let ascAttempts = 0;
              while (ascAttempts < 24) {
                const currentMonthYear = await driver.executeScript(`
                  const monthSpan = document.querySelector('#ui-datepicker-div .ui-datepicker-month');
                  const yearSpan = document.querySelector('#ui-datepicker-div .ui-datepicker-year');
                  return {
                    month: monthSpan ? monthSpan.textContent : '',
                    year: yearSpan ? yearSpan.textContent : '',
                    visible: document.querySelector('#ui-datepicker-div')?.style.display !== 'none'
                  };
                `);

                if (!currentMonthYear.visible) break;

                const currentYear = parseInt(currentMonthYear.year);
                const monthNamesEn = [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ];
                const monthNamesEs = [
                  "Enero",
                  "Febrero",
                  "Marzo",
                  "Abril",
                  "Mayo",
                  "Junio",
                  "Julio",
                  "Agosto",
                  "Septiembre",
                  "Octubre",
                  "Noviembre",
                  "Diciembre",
                ];

                let currentMonthIndex = monthNamesEn.findIndex((m) =>
                  currentMonthYear.month
                    .toLowerCase()
                    .includes(m.toLowerCase().substring(0, 3))
                );
                if (currentMonthIndex === -1) {
                  currentMonthIndex = monthNamesEs.findIndex((m) =>
                    currentMonthYear.month
                      .toLowerCase()
                      .includes(m.toLowerCase().substring(0, 3))
                  );
                }

                if (
                  currentYear === ascTargetYear &&
                  currentMonthIndex === ascTargetMonth
                ) {
                  break;
                }

                const needsNext =
                  currentYear < ascTargetYear ||
                  (currentYear === ascTargetYear && currentMonthIndex < ascTargetMonth);

                if (needsNext) {
                  await driver.executeScript(`
                    document.querySelector('#ui-datepicker-div .ui-datepicker-next').click();
                  `);
                } else {
                  await driver.executeScript(`
                    document.querySelector('#ui-datepicker-div .ui-datepicker-prev').click();
                  `);
                }
                await sleep(300);
                ascAttempts++;
              }

              // Check datepicker state before clicking
              const dpState = await driver.executeScript(`
                const dp = document.getElementById('ui-datepicker-div');
                if (!dp) return { visible: false, error: 'datepicker not found' };
                
                const monthSpan = dp.querySelector('.ui-datepicker-month');
                const yearSpan = dp.querySelector('.ui-datepicker-year');
                const selectableCells = dp.querySelectorAll('td[data-handler="selectDay"]');
                const allDayCells = dp.querySelectorAll('td a.ui-state-default');
                
                const availableDays = [];
                selectableCells.forEach(cell => {
                  const link = cell.querySelector('a');
                  if (link) availableDays.push(parseInt(link.textContent.trim()));
                });
                
                return {
                  visible: dp.style.display !== 'none',
                  month: monthSpan ? monthSpan.textContent : 'unknown',
                  year: yearSpan ? yearSpan.textContent : 'unknown',
                  selectableCellsCount: selectableCells.length,
                  allDayCellsCount: allDayCells.length,
                  availableDays: availableDays.slice(0, 10),
                  targetDay: ${ascTargetDay}
                };
              `);

              log(`ASC datepicker state:`);
              console.log(JSON.stringify(dpState, null, 2));

              // Click the ASC day
              logInfo(`Clicking ASC day ${ascTargetDay}...`);
              const ascDayClicked = await driver.executeScript(`
                const targetDay = ${ascTargetDay};
                
                // First try: cells with selectDay handler
                let cells = document.querySelectorAll('#ui-datepicker-div td[data-handler="selectDay"]');
                for (const cell of cells) {
                  const link = cell.querySelector('a');
                  if (link && parseInt(link.textContent.trim()) === targetDay) {
                    link.click();
                    return { clicked: true, method: 'selectDay handler' };
                  }
                }
                
                // Second try: any clickable day link
                const allLinks = document.querySelectorAll('#ui-datepicker-div td a.ui-state-default');
                for (const link of allLinks) {
                  if (parseInt(link.textContent.trim()) === targetDay) {
                    link.click();
                    return { clicked: true, method: 'ui-state-default link' };
                  }
                }
                
                // Third try: use jQuery datepicker API directly
                try {
                  const dateStr = '${ascDate}';
                  $('#appointments_asc_appointment_date').datepicker('setDate', dateStr);
                  $('#appointments_asc_appointment_date').trigger('change');
                  return { clicked: true, method: 'jQuery setDate' };
                } catch(e) {
                  return { clicked: false, error: e.message };
                }
              `);

              logInfo(`ASC day click result: ${JSON.stringify(ascDayClicked)}`);

              if (ascDayClicked?.clicked) {
                await sleep(2000);

                // Verify ASC date was actually set
                const ascDateValue = await driver.executeScript(`
                  return document.getElementById('appointments_asc_appointment_date')?.value || '';
                `);
                logInfo(`ASC date field value: "${ascDateValue}"`);

                if (!ascDateValue) {
                  logError("ASC date was not set in the field!");
                  continue; // Skip to next date
                }
                logSuccess(`ASC date confirmed: ${ascDateValue}`);

                // Fetch ASC times via API (since jQuery setDate doesn't trigger AJAX)
                logInfo("Fetching ASC time slots via API...");
                const ascTimesUrl = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/times/${ascFacilityId}.json?date=${ascDate}&consulate_id=${FACILITY_ID}&appointments[expedite]=false`;

                const ascTimesResult = await driver.executeScript(`
                  return fetch("${ascTimesUrl}", {
                    method: 'GET',
                    headers: {
                      'Accept': 'application/json',
                      'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'include'
                  })
                  .then(r => r.json())
                  .catch(e => ({ error: e.message }));
                `);

                if (ascTimesResult.error) {
                  logError(`Failed to fetch ASC times: ${ascTimesResult.error}`);
                  continue; // Skip to next date
                }

                const ascAvailableTimes =
                  ascTimesResult.available_times || ascTimesResult.times || [];
                logInfo(`ASC times from API: ${JSON.stringify(ascAvailableTimes)}`);

                if (ascAvailableTimes.length === 0) {
                  logError("No ASC time slots available for this date");
                  continue; // Skip to next date
                }

                // Populate ASC time dropdown and select first time
                const firstAscTime = ascAvailableTimes[0];
                logInfo(`Selecting ASC time: ${firstAscTime}`);

                const ascTimeSet = await driver.executeScript(`
                  const select = document.getElementById('appointments_asc_appointment_time');
                  if (!select) return { success: false, error: 'dropdown not found' };
                  
                  // Clear existing options except first placeholder
                  while (select.options.length > 1) {
                    select.remove(1);
                  }
                  
                  // Add available times
                  const times = ${JSON.stringify(ascAvailableTimes)};
                  times.forEach(time => {
                    const opt = document.createElement('option');
                    opt.value = time;
                    opt.text = time;
                    select.add(opt);
                  });
                  
                  // Select first time
                  select.value = '${firstAscTime}';
                  select.dispatchEvent(new Event('change', { bubbles: true }));
                  
                  return { success: true, value: select.value, optionsCount: select.options.length };
                `);

                logInfo(`ASC time set result: ${JSON.stringify(ascTimeSet)}`);

                if (!ascTimeSet.success || ascTimeSet.value !== firstAscTime) {
                  logError("Could not select ASC time - skipping this date");
                  continue; // Skip to next date
                }
                logSuccess(`ASC time confirmed: ${firstAscTime}`);
              } else {
                logError(`Could not click ASC day ${ascTargetDay} - skipping this date`);
                continue; // Skip to next date
              }
            } else {
              logError("No valid ASC dates available - skipping");
              continue; // Skip to next date
            }
          }
        } else {
          logError("ASC section elements not found - cannot proceed");
          continue; // Skip to next date
        }

        // Final verification before submit
        const finalCheck = await driver.executeScript(`
          const consulateDate = document.getElementById('appointments_consulate_appointment_date')?.value;
          const consulateTime = document.getElementById('appointments_consulate_appointment_time')?.value;
          const ascDate = document.getElementById('appointments_asc_appointment_date')?.value;
          const ascTime = document.getElementById('appointments_asc_appointment_time')?.value;
          return { consulateDate, consulateTime, ascDate, ascTime };
        `);

        log("Final form state before submit:");
        console.log(JSON.stringify(finalCheck, null, 2));

        if (
          !finalCheck.consulateDate ||
          !finalCheck.consulateTime ||
          !finalCheck.ascDate ||
          !finalCheck.ascTime
        ) {
          logError("Form is incomplete - missing required fields!");
          logError(
            `Consulate: ${finalCheck.consulateDate} @ ${finalCheck.consulateTime}`
          );
          logError(`ASC: ${finalCheck.ascDate} @ ${finalCheck.ascTime}`);
          continue; // Skip to next date
        }

        logSuccess("All fields filled! Ready to submit.");
        await sleep(1000);

        // Click the submit/reschedule button
        logInfo("Submitting reschedule...");
        const submitBtn = await driver.findElement(By.id("appointments_submit"));
        await submitBtn.click();
        await sleep(2000);

        // Handle confirmation modal - wait for it to appear
        logInfo("Waiting for confirmation modal...");
        await sleep(1500);

        // Look for the modal and click Confirmar
        let modalConfirmed = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          const confirmResult = await driver.executeScript(`
            // The modal has "Cancelar" (gray) and "Confirmar" (red) buttons
            // First try SweetAlert2 style selectors
            const swalConfirm = document.querySelector('.swal2-confirm');
            if (swalConfirm && swalConfirm.offsetParent !== null) {
              swalConfirm.click();
              return { clicked: true, method: 'swal2-confirm' };
            }
            
            // Try finding buttons by exact text "Confirmar"
            const allButtons = document.querySelectorAll('button, a.button, a.btn, input[type="button"], input[type="submit"]');
            for (const btn of allButtons) {
              const text = btn.textContent.trim();
              if (text === 'Confirmar' && btn.offsetParent !== null) {
                btn.click();
                return { clicked: true, method: 'text-match', text: text };
              }
            }
            
            // Try common modal confirm button patterns
            const confirmSelectors = [
              '.swal2-actions .swal2-confirm',
              '.sweet-alert button.confirm',
              '.reveal-modal a.alert',
              '.modal .btn-danger',
              '.modal .btn-primary',
              'button.confirm',
              '.ui-dialog-buttonpane button:last-child'
            ];
            
            for (const selector of confirmSelectors) {
              const btn = document.querySelector(selector);
              if (btn && btn.offsetParent !== null) {
                btn.click();
                return { clicked: true, method: 'selector', selector: selector };
              }
            }
            
            // Check if any modal is visible
            const modalVisible = !!(
              document.querySelector('.swal2-popup:not(.swal2-hide)') ||
              document.querySelector('.sweet-alert:not(.hideSweetAlert)') ||
              document.querySelector('.reveal-modal[style*="block"]') ||
              document.querySelector('.modal.show')
            );
            
            return { clicked: false, modalVisible: modalVisible };
          `);

          logInfo(
            `Confirmation attempt ${attempt + 1}: ${JSON.stringify(confirmResult)}`
          );

          if (confirmResult.clicked) {
            logSuccess("Confirmar button clicked!");
            modalConfirmed = true;
            await sleep(3000);
            break;
          }

          if (!confirmResult.modalVisible && attempt > 1) {
            logInfo("No modal visible, continuing...");
            break;
          }

          await sleep(1000);
        }

        if (!modalConfirmed) {
          logWarn("Could not find Confirmar button - checking page status...");
        }

        // Check for "slot taken" error modal
        // "Su cita no pudo ser programada. Por favor, haga una selección válida."
        await sleep(1000);
        const errorModalCheck = await driver.executeScript(`
          const pageText = document.body.innerText || '';
          const hasError = pageText.includes('no pudo ser programada') || 
                          pageText.includes('selección válida') ||
                          pageText.includes('could not be scheduled') ||
                          pageText.includes('no longer available');
          
          // Try to click OK button to dismiss error
          if (hasError) {
            const okButtons = document.querySelectorAll('button, a.button');
            for (const btn of okButtons) {
              const text = btn.textContent.trim().toUpperCase();
              if ((text === 'OK' || text === 'ACEPTAR') && btn.offsetParent !== null) {
                btn.click();
                return { hasError: true, dismissed: true };
              }
            }
            // Also try SweetAlert2 confirm button
            const swalBtn = document.querySelector('.swal2-confirm');
            if (swalBtn) {
              swalBtn.click();
              return { hasError: true, dismissed: true };
            }
            return { hasError: true, dismissed: false };
          }
          return { hasError: false };
        `);

        if (errorModalCheck.hasError) {
          logWarn(`Slot was taken while filling form - trying next date...`);
          if (errorModalCheck.dismissed) {
            logInfo("Error modal dismissed");
          }
          await sleep(1000);
          continue; // Try next date
        }

        // Check for confirmation or success message
        const pageSource = await driver.getPageSource();
        if (
          pageSource.includes("Successfully") ||
          pageSource.includes("successfully") ||
          pageSource.includes("exitosamente") ||
          pageSource.includes("confirmada") ||
          pageSource.includes("programada correctamente")
        ) {
          playSuccessSound(); // Celebratory sound!
          logSuccess(`🎉 RESCHEDULED SUCCESSFULLY to ${date.date} at ${selectedTime}!`);
          await sendNotification(
            `✅ RESCHEDULED! New date: ${date.date} at ${selectedTime}`
          );
          return true; // Success!
        } else {
          // Double-check we're not still on the form page
          const stillOnForm = await driver.executeScript(`
            return !!document.getElementById('appointments_submit');
          `);

          if (stillOnForm) {
            logWarn(
              "Still on form page - submission may have failed, trying next date..."
            );
            continue; // Try next date
          }

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
