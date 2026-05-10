import axios from "axios";

const waClient = axios.create({
  baseURL: process.env.WHATSAPP_URI,
  headers: {
    "Content-Type": "application/json",
    Authorization: process.env.WHATSAPP_SECRET,
  },
  timeout: 5000,
});

export default waClient;
