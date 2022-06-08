const moment = require("moment");
const axios = require("axios").default;
const { Builder, By, Key, until } = require("selenium-webdriver");

const casAndConsulate = async (email, password, scheduleId, consulateDate, casDate) => {
  const USERNAME = email;
  const PASSWORD = password;
  const SCHEDULE_ID = scheduleId;
  const CONSULATE_DATE = consulateDate;
  const CAS_DATE = casDate;
  const COUNTRY_CODE = "es-co";
  const REGEX_CONTINUE = "//a[contains(text(),'Continuar')]";
  const DAYS_IN_COUNTRY = 25;
  const CONSULATE_ID = 25; //Bogota Consulate ID
  const DATE_CONSULATE_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/days/${DAYS_IN_COUNTRY}.json?appointments[expedite]=false`;
  const TIME_CONSULATE_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/times/${DAYS_IN_COUNTRY}.json?date=::date::&appointments[expedite]=false`;
  const DATE_CAS_URL = ` https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/times/${DAYS_IN_COUNTRY}.json?date=&consulate_id=${CONSULATE_ID}&consulate_date=::date::&consulate_time=::time::&appointments[expedite]=false`;
  const LOGIN_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/users/sign_in`;
  const APPOINTMENT_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment`;
  const PUSH_URL = "https://api.pushover.net/1/messages.json";
  const PUSH_TOKEN = "acz5fhqxtqxmsqb6eh7ip17wng733h";
  const PUSH_USER = "u3avnicb6o63uexim1g5v86dqks8nz";
  const MAX_RETRIES = 10;

  const driver = new Builder().forBrowser("chrome").build();

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
        console.log("Notification sent: ", res.data);
      })
      .catch((err) => {
        console.log("Error at sendNotification: ", err);
      });
  };

  const login = async () => {
    try {
      await driver.get(LOGIN_URL);
      const a = await driver.findElement(By.xpath('//a[@class="down-arrow bounce"]'));
      await a.click();
      console.log("Login started...");
      console.log("Input email...");
      const user = await driver.findElement(By.id("user_email"));
      await user.sendKeys(USERNAME);
      console.log("Input password...");
      const pwd = await driver.findElement(By.id("user_password"));
      await pwd.sendKeys(PASSWORD);
      console.log("Click accept terms...");
      await sleep(2000);
      const box = await driver.findElement(By.className("icheckbox"));
      await box.click();
      console.log("Click login button...");
      const btn = await driver.findElement(By.name("commit"));
      await btn.click();
      console.log("Login in progress...");
      const continueBtn = By.xpath(REGEX_CONTINUE);
      await driver.wait(until.elementLocated(continueBtn), 10000);
      console.log("✅ Login SUCCESS...");
      startRescheduling();
    } catch (error) {
      console.log("Error at login: ", error);
    }
  };

  const getConsulateDates = async () => {
    await driver.get(DATE_CONSULATE_URL);
    const content = await driver.findElement(By.css("pre")).getText();
    const dates = JSON.parse(content);
    if (!dates.length) {
      // await sendNotification("No dates available...");
      throw new Error("No consulate dates available...");
    } else {
      const validConsulateDates = dates.filter(({ date }) => {
        const isBefore = moment(date).isBefore(moment(CONSULATE_DATE), "day");
        // console.log(`Check ${date} < ${CONSULATE_DATE} ${isBefore}`);
        return isBefore;
      });
      if (!validConsulateDates.length) {
        console.log("No dates available...");
        throw new Error("No dates available...");
      }
      return validConsulateDates;
    }
  };

  const getCasDates = async (date, time) => {
    await driver.get(DATE_CAS_URL.replace("::date::", date).replace("::time::", time));
    const content = await driver.findElement(By.css("pre")).getText();
    // console.log("Content: ", content);
    const dates = JSON.parse(content);
    if (!dates.length) {
      // await sendNotification("No dates available...");
      // throw new Error("No CAS dates available...");
      return null;
    } else {
      const validConsulateDates = dates.filter(({ date }) => {
        const isBefore = moment(date).isBefore(moment(CAS_DATE), "day");
        // console.log(`Check ${date} < ${CAS_DATE} ${isBefore}`);
        return isBefore;
      });
      if (!validConsulateDates.length) {
        console.log("No CAS dates available...");
        throw new Error("No CAS dates available...");
      }
      return validConsulateDates;
    }
  };

  const getConsulateDateTime = async (date) => {
    await driver.get(TIME_CONSULATE_URL.replace("::date::", date));
    const content = await driver.findElement(By.css("pre")).getText();
    const times = JSON.parse(content).available_times;
    if (!times.length) return null;
    return times[0]; // Return first available time
  };

  const getCasDateTime = async (date) => {
    await driver.get(TIME_CONSULATE_URL.replace("::date::", date));
    const content = await driver.findElement(By.css("pre")).getText();
    const times = JSON.parse(content).available_times;
    if (!times.length) return null;
    return times[0]; // Return first available time
  };

  const handleConsulateReschedule = async (date) => {
    console.log("Rescheduling consulate date: ", date);
    const time = await getTime(date.date);
    driver.get(APPOINTMENT_URL);
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
      "appointments[consulate_appointment][facility_id]": DAYS_IN_COUNTRY,
      "appointments[consulate_appointment][date]": date, // Is it an object or data.date ?
      "appointments[consulate_appointment][time]": time,
    };
    const cookie = await driver.manage().getCookie("_yatri_session");
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36",
      Referer: APPOINTMENT_URL,
      Cookie: `_yatri_session=${cookie.value}`,
    };

    console.log(payload);

    console.log(headers);

    // await axios
    //   .post(APPOINTMENT_URL, {
    //     headers,
    //     data: payload,
    //   })
    //   .then((res) => {
    //     console.log("Reescheduled sent: ", res);
    //   })
    //   .catch((err) => {
    //     console.log("Error at : ", err);
    //   });
    // r = requests.post(APPOINTMENT_URL, headers=headers, data=data)
    // if(r.text.find('Successfully Scheduled') != -1):
    //     msg = f"Rescheduled Successfully! {date} {time}"
    //     send_notification(msg)
    //     EXIT = True
    // else:
    //     msg = f"Reschedule Failed. {date} {time}"
    //     send_notification(msg)
  };

  const startRescheduling = async () => {
    let counter = 1;
    while (1) {
      console.log(`Rescheduling started x${counter}...`);
      try {
        // TODO: Get consulate dates
        const consulateDates = await getConsulateDates();
        console.log("✅ Closer consulate dates: ", consulateDates);
        // TODO: Find available consulate times for any date starting from the closest one
        for (let index = 0; index < consulateDates.length; index++) {
          const checkingDate = consulateDates[index];
          try {
            const consulateTime = await getConsulateDateTime(checkingDate.date);
            // we only check for the first available time for now
            if (consulateTime) {
              console.log("Consulate date: ", checkingDate.date);
              console.log("Consulate time: ", consulateTime);
              // TODO: Get CAS dates for that consulate id
              const casDates = await getCasDates(checkingDate.date, consulateTime);
              if (casDates) {
                // TODO: Get CAS times for any date
                for (let index = 0; index < casDates.length; index++) {
                  const checkingCasDate = casDates[index];
                  console.log("Checking CAS date: ", checkingCasDate);
                  console.log("Getting CAS times...");
                  const casTime = await getCasDateTime(checkingCasDate.date);
                  if (casTime) {
                    // TODO: Reschedule
                    console.log("✅✅✅✅✅ success you can reschedule with:");
                    console.log("CAS date: ", checkingCasDate);
                    console.log("CAS time: ", casTime);
                    console.log("Consulate date: ", checkingDate);
                    console.log("Consulate time: ", consulateTime);
                  } else {
                    console.log(
                      `❌ ==> No CAS times available for ${checkingCasDate.date}`
                    );
                    console.log("==================================================");
                  }
                }
                // throw new Error("X ==> No CAS times available...");
              } else {
                console.log(
                  `❌ ==> No CAS dates available for ${checkingDate.date} - ${consulateTime}`
                );
                console.log("------------------------------------------------------");
              }
            } else {
              continue; // If no consulate times available, continue to next date
            }
          } catch (error) {
            console.log("Error at getConsulateDateTime: ", error);
          }
        }
        throw new Error("No consulate times for any of the dates available...");
      } catch (error) {
        counter += 1;
        console.log("❌ ==> Error at startRescheduling: ", error.message);
        console.log("==================================================");
        await sleep(30000); // 1 minute
      }
    }
    console.log("Rescheduling failed...");
  };

  try {
    await login();
  } catch (error) {
    console.log("Error at login: ", error);
  }
};

const email = process.argv[2];
const password = process.argv[3];
const scheduleId = process.argv[4];
const consulateDate = process.argv[5];
const casDate = process.argv[6];

casAndConsulate(email, password, scheduleId, consulateDate, casDate);
