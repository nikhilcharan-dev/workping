import nodemailer from "nodemailer";

/* @Google App password should be configured */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

transporter.verify((err, info) => {
    if (err) {
        console.error("Error Building Mail Connection", err);
    } else {
        console.log("[Mail Service] Verified");
    }
});

export default transporter;
