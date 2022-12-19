export const rimet_xml = {
  /**
   * 进入打卡
   */
  enter_checkin:
    'android=new UiSelector().resourceId("com.alibaba.android.rimet:id/item_title").text("打卡")',
  /**
   * 下班打卡
   */
  work_checkin:
    'android=new UiSelector().className("android.view.View").text("上班打卡")',
  /**
   * 下班打卡
   */
  off_work_checkin:
    'android=new UiSelector().className("android.view.View").text("下班打卡")',
  /**
   * 输入手机号
   */
  et_phone_input:
    'android=new UiSelector().resourceId("com.alibaba.android.rimet:id/et_phone_input")',
  /**
   * 输入密码
   */
  et_password:
    'android=new UiSelector().resourceId("com.alibaba.android.rimet:id/et_password")',
  cb_privacy:
    'android=new UiSelector().resourceId("com.alibaba.android.rimet:id/cb_privacy")',
  /**
   * 登录
   */
  login:
    'android=new UiSelector().resourceId("com.alibaba.android.rimet:id/tv")',
  session_item:
    'android=new UiSelector().resourceId("com.alibaba.android.rimet:id/session_item").enabled(true).instance(0)',
};
