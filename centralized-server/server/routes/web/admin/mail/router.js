import { Router } from "express";
import {
  send_simple_mail,
  send_html_mail,
  send_greeting,
  send_alert_info,
  send_alert_warning,
  send_alert_danger,
  send_alert_success,
  send_general_notification,
} from "#webController/admin/mail/controller.js";

const router = Router();

router.post("/send-mail", send_simple_mail);
router.post("/send-html", send_html_mail);
router.post("/greeting", send_greeting);
router.post("/alert/info", send_alert_info);
router.post("/alert/warning", send_alert_warning);
router.post("/alert/danger", send_alert_danger);
router.post("/alert/success", send_alert_success);
router.post("/notification", send_general_notification);

export default router;
