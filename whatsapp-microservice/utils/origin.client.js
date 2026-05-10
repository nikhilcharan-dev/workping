import axios from "axios";

/**
 * Axios client for the Workping main server's internal API.
 * All requests include x-internal-secret for authentication.
 */
const originClient = axios.create({
  baseURL: process.env.ORIGIN,
  headers: {
    "Content-Type": "application/json",
    "x-internal-secret": process.env.INTERNAL_SECRET,
  },
  timeout: 8000,
});

export default originClient;
