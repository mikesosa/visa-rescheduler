const moment = require("moment");
const axios = require("axios").default;
const { Builder, By, Key, until } = require("selenium-webdriver");

const rescheduler = async (email, password, currentDate, scheduleId) => {
  const USERNAME = email;
  const PASSWORD = password;
  const SCHEDULE_ID = scheduleId;
  const MY_SCHEDULE_DATE = currentDate;
  const COUNTRY_CODE = "es-co";
  const REGEX_CONTINUE = "//a[contains(text(),'Continuar')]";
  const DAYS_IN_COUNTRY = 25;
  const DATE_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/days/${DAYS_IN_COUNTRY}.json?appointments[expedite]=false`;
  const LOGIN_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/users/sign_in`;
  const TIME_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment/times/${DAYS_IN_COUNTRY}.json?date=::date::&appointments[expedite]=false`;
  const APPOINTMENT_URL = `https://ais.usvisa-info.com/${COUNTRY_CODE}/niv/schedule/${SCHEDULE_ID}/appointment`;
  const PUSH_URL = "https://api.pushover.net/1/messages.json";
  const PUSH_TOKEN = "akdhcemcyhgbv8xz7j6a8e582ct7ok";
  const PUSH_USER = "u86nkp3b1y56opwrfzxwrznf8g5qjp";
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
      console.log("Login SUCCESS...");
      startRescheduling();
    } catch (error) {
      console.log("Error at login: ", error);
    }
  };

  const getAvailableDates = async () => {
    await driver.get(DATE_URL);
    const content = await driver.findElement(By.css("pre")).getText();
    const dates = JSON.parse(content);
    if (!dates.length) {
      console.log("No dates available...");
      // await sendNotification("No dates available...");
      throw new Error("No dates available...");
    }
    return dates;
  };

  const getTime = async (date) => {
    await driver.get(TIME_URL.replace("::date::", date));
    const content = await driver.findElement(By.css("pre")).getText();
    const times = JSON.parse(content).available_times;
    if (!times.length) {
      console.log("No times available...");
      // await sendNotification("No times available...");
      throw new Error("No times available...");
    }
    return times[0];
  };

  const handleReschedule = async (date) => {
    console.log("Rescheduling date: ", date);
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

    sendNotification("Rescheduling...");

    await axios
      .post(APPOINTMENT_URL, {
        headers,
        data: payload,
      })
      .then((res) => {
        console.log("Rescheduled sent: ", res);
        sendNotification("Rescheduled sent: " + res.data);
      })
      .catch((err) => {
        console.log("Error at : ", err);
        sendNotification("Error at: " + err);
      });

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
      try {
        console.log(`Rescheduling started x${counter}...`);

        const dates = await getAvailableDates();

        const validDates = dates.filter(({ date }) => {
          const isBefore = moment(date).isBefore(moment(MY_SCHEDULE_DATE), "day");
          //   console.log(`Check ${date} < ${MY_SCHEDULE_DATE} ${isBefore}`);
          return isBefore;
        });

        if (validDates.length) {
          console.log("Closer dates: ", validDates);
          const closestDate = validDates[0];
          return handleReschedule(closestDate);
        } else {
          throw new Error("No available dates...");
        }
      } catch (error) {
        counter += 1;
        console.log("Error at startRescheduling: ", error.message);
        await sleep(60000); // 1 minute
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

module.exports = { rescheduler };
