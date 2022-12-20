import { rimet_xml } from "./selector";
import { remote, RemoteOptions } from "webdriverio";
import { createClient, Client } from "oicq";
import { resolve } from "path";
import { CronJob } from "cron";
import { config } from "dotenv";
import dayjs from "dayjs";

config();

let qqClient: Client | null = null;

const PHONE = process.env.PHONE;
const PASSWORD = process.env.PASSWORD;
const QQ_ID = process.env.QQ_ID;
const QQ_PASSWORD = process.env.QQ_PASSWORD;
const QQ_NOTICE_ID = process.env.QQ_NOTICE_ID;

if (QQ_ID && QQ_PASSWORD) {
  qqClient = createClient(Number(QQ_ID));
  qqClient.on("system.login.slider", function () {
    process.stdin.once("data", (ticket) =>
      this.submitSlider(String(ticket).trim())
    );
  });
  qqClient.login(QQ_PASSWORD);
  qqClient.on("message.private", (e) => {
    const msg = e.message[0];
    if (msg.type === "text" && msg.text) {
      console.log(" >> message.private:", msg.text);
      if (msg.text.indexOf("run-work") !== -1) {
        main("work");
      }
      if (msg.text.indexOf("run-rest") !== -1) {
        main("rest");
      }
    }
  });
}

const format = "YYYY-MM-DD HH:mm:ss";

const opts: RemoteOptions = {
  path: "/wd/hub",
  port: 4723,
  capabilities: {
    platformName: "Android",
    app: resolve(__dirname, "../rimet.apk"),
    deviceName: "Android Emulator",
    automationName: "UiAutomator2",
    appActivity: ".biz.LaunchHomeActivity",
    appPackage: "com.alibaba.android.rimet",
    autoGrantPermissions: true,
    dontStopAppOnReset: true,
    noReset: true,
  },
  logLevel: "error",
  outputDir: resolve(__dirname, "../logs"),
};

const checkin = {
  time: 0,
  /**
   * -1 打卡失败
   * 0  未打卡
   * 1  打卡中
   * 2  打卡成功
   */
  status: 0,
  work_day: 0,
  rest_day: 0,
};

/**
 * 获取指定范围内的随机数
 */
export function randomValue(min: number, max: number) {
  return Math.floor(Math.random() * (min - max) + max);
}

async function waitForDisplayed(s: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(void 0), s * 1000);
  });
}

async function main(type: "work" | "rest") {
  checkin.status = 1;
  const client = await remote(opts);
  try {
    const activity = await client.getCurrentActivity();
    console.log(`>> ${dayjs().format(format)} 启动 Activity `, activity);
    // 需要登录
    if (activity === "com.alibaba.android.user.login.SignUpWithPwdActivity") {
      console.log(`>> ${dayjs().format(format)} 登录账号 `, PHONE);
      if (!PHONE || !PASSWORD) {
        console.error("缺少登录信息");
        return;
      }
      console.log(`>> ${dayjs().format(format)} 查找手机号输入框 `);
      const et_phone = await client.$(rimet_xml.et_phone_input);
      console.log(`>> ${dayjs().format(format)} 点击手机号输入框 `);
      await et_phone.click();
      console.log(`>> ${dayjs().format(format)} 清除手机号输入框 `);
      await et_phone.clearValue();
      console.log(`>> ${dayjs().format(format)} 输入需要登录的手机号 `, PHONE);
      await client.keys(PHONE.split("")).catch(() => {
        // 这里必然会报错，添加 catch 避免影响后续
      });
      await waitForDisplayed(5);
      console.log(`>> ${dayjs().format(format)} 查找密码输入框 `);
      const et_password = await client.$(rimet_xml.et_password);
      console.log(`>> ${dayjs().format(format)} 点击密码输入框 `);
      await et_password.click();
      console.log(`>> ${dayjs().format(format)} 清除密码输入框 `);
      await et_password.clearValue();
      console.log(`>> ${dayjs().format(format)} 输入登陆密码 `);
      await client.keys(PASSWORD.split("")).catch(() => {
        // 这里必然会报错，添加 catch 避免影响后续
      });
      await waitForDisplayed(5);
      console.log(`>> ${dayjs().format(format)} 查找隐私协议按钮 `);
      const cb_privacy = await client.$(rimet_xml.cb_privacy);
      console.log(`>> ${dayjs().format(format)} 点击隐私协议按钮 `);
      await cb_privacy.click();
      await waitForDisplayed(3);
      console.log(`>> ${dayjs().format(format)} 查找登录按钮 `);
      const login = await client.$(rimet_xml.login);
      console.log(`>> ${dayjs().format(format)} 点击登录按钮 `);
      await login.click();
      await waitForDisplayed(5);
    }
    const current_activity = await client.getCurrentActivity();
    console.log(
      `>> ${dayjs().format(format)} 当前 Activity `,
      current_activity
    );
    if (current_activity !== ".biz.LaunchHomeActivity") {
      console.error("进入主页面失败");
      return;
    }
    let msg = "";
    console.log(`>> ${dayjs().format(format)} 等待极速打卡执行 `);
    await waitForDisplayed(10); // 等待10s检查极速打卡结果
    const session_item = await client.$(rimet_xml.session_item);
    const desc = await session_item.getAttribute("content-desc").catch(() => {
      // 避免 session_item 不存在报错
    });
    if (!session_item.error && desc && desc.indexOf("极速打卡") !== -1) {
      // 极速打卡成功
      msg = desc;
    } else {
      console.log(`>> ${dayjs().format(format)} 查找打卡按钮 `);
      const enter_checkin = await client.$(rimet_xml.enter_checkin);
      console.log(`>> ${dayjs().format(format)} 点击打卡按钮 `);
      await enter_checkin.click();
      await waitForDisplayed(5);
      console.log(`>> ${dayjs().format(format)} 查找上班/下班按钮 `);
      const [work_checkin, off_work_checkin] = await Promise.all([
        client.$(rimet_xml.work_checkin),
        client.$(rimet_xml.off_work_checkin),
      ]);
      if (!work_checkin.error) {
        console.log(`>> ${dayjs().format(format)} 点击上班按钮 `);
        await work_checkin.click();
      } else if (!off_work_checkin.error) {
        console.log(`>> ${dayjs().format(format)} 点击下班按钮 `);
        await off_work_checkin.click();
      }
      // @tip 暂时缺少对结果页面的检查
      msg = `打卡成功: ${dayjs().format(format)}`;
    }
    console.log(`>> ${dayjs().format(format)} ${msg} `);
    checkin.status = 2;
    checkin.time = 0;
    if (type === "work") {
      checkin.work_day = new Date().getDay();
    } else {
      checkin.rest_day = new Date().getDay();
    }
    if (QQ_NOTICE_ID && qqClient) {
      qqClient.pickUser(Number(QQ_NOTICE_ID)).sendMsg(msg);
    }
    await client.closeApp();
    await client.deleteSession();
  } catch (err) {
    checkin.status = -1;
    await client.closeApp();
    await client.deleteSession();
    console.error(err);
  }
}

// 周一至周五上午 9 点到 10 点之间每分钟执行一次
const start_job = new CronJob("0 * 9-10 * * 1-5", () => {
  if (!checkin.time) {
    // 随机一个打卡时间,避免每天打卡时间一致
    checkin.time = randomValue(25, 45);
    console.log(`>> ${dayjs().format(format)} 初始化打卡的时间 `, checkin.time);
  }
  if (checkin.work_day) {
    const day = new Date().getDay();
    if (checkin.work_day === day) {
      return;
    }
    checkin.time = 0;
    checkin.status = 0;
    checkin.work_day = 0;
  }
  const mm = dayjs().format("mm");
  if (Number(mm) >= checkin.time && checkin.status < 0) {
    // 到达指定打卡时间段,开始打卡
    console.log(`>> ${dayjs().format(format)} 到达指定打卡时间段,开始打卡 `);
    main("work");
  }
});

// 周一至周五下午 18 点到 19 点之间每分钟执行一次
const end_job = new CronJob("0 * 18-19 * * 1-5", () => {
  if (!checkin.time) {
    // 随机一个打卡时间,避免每天打卡时间一致
    checkin.time = randomValue(45, 55);
    console.log(`>> ${dayjs().format(format)} 初始化打卡的时间 `, checkin.time);
  }
  if (checkin.rest_day) {
    const day = new Date().getDay();
    if (checkin.rest_day === day) {
      return;
    }
    checkin.time = 0;
    checkin.status = 0;
    checkin.rest_day = 0;
  }
  const mm = dayjs().format("mm");
  if (Number(mm) >= checkin.time && checkin.status < 0) {
    // 到达指定打卡时间段,开始打卡
    console.log(`>> ${dayjs().format(format)} 到达指定打卡时间段,开始打卡 `);
    main("rest");
  }
});

start_job.start();
end_job.start();
