const { expect } = require("@playwright/test");
const { API_BASE_URL, TEST_USERNAME, TEST_PASSWORD } = require("./env");

async function loginAndGetToken(request, username = TEST_USERNAME, password = TEST_PASSWORD) {
  expect(username, "Missing TEST_USERNAME in env").toBeTruthy();
  expect(password, "Missing TEST_PASSWORD in env").toBeTruthy();

  const payloads = [
    { username, password },
    { Username: username, Password: password },
  ];

  let lastText = "";
  let lastStatus = 0;

  for (const data of payloads) {
    const res = await request.post(`${API_BASE_URL}/api/login`, { data });
    lastStatus = res.status();
    lastText = await res.text();

    if (res.ok()) {
      const body = JSON.parse(lastText);
      if (body?.token) return body.token;
    }
  }

  throw new Error(`Login failed: ${lastStatus} ${lastText}`);
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { loginAndGetToken, bearer };