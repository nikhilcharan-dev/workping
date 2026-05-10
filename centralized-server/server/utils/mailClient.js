import axios from "axios";

const mailClient = axios.create({
  baseURL: process.env.MAIL_SERVICE_URI,
  headers: {
    "Content-Type": "application/json",
    Authorization: process.env.MAIL_SERVICE_KEY,
  },
  timeout: 5000,
});

export default mailClient;
