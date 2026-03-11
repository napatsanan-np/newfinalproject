const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";
const WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:3000";

const TEST_USERNAME = process.env.TEST_USERNAME || "";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "";

module.exports = { API_BASE_URL, WEB_BASE_URL, TEST_USERNAME, TEST_PASSWORD };