const { test, expect } = require("@playwright/test");
const { API_BASE_URL } = require("../utils/env");
const { loginAndGetToken, bearer } = require("../utils/auth");

function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractRoomId(body) {
  if (!body || typeof body !== "object") return null;

  return (
    body.room_id ??
    body.id ??
    body.id_room ??
    body.room?.room_id ??
    body.room?.id ??
    body.data?.room_id ??
    body.data?.id ??
    null
  );
}

function roomPayloadFromEnvOrDefault() {
  if (process.env.ROOM_CREATE_PAYLOAD_JSON) {
    return JSON.parse(process.env.ROOM_CREATE_PAYLOAD_JSON);
  }

  const suffix = uniqueSuffix();
  return {
    room_name: `PW-ROOM-${suffix}`,
    building: "TEST-BUILDING",
    capacity: 30,
  };
}

function roomUpdatePayloadFromBase(basePayload) {
  if (process.env.ROOM_UPDATE_PAYLOAD_JSON) {
    return JSON.parse(process.env.ROOM_UPDATE_PAYLOAD_JSON);
  }

  return {
    ...basePayload,
    room_name: `${basePayload.room_name || "PW-ROOM"}-EDIT`,
    capacity: Number(basePayload.capacity || 30) + 5,
  };
}

async function createRoom(request, token, payload) {
  const res = await request.post(`${API_BASE_URL}/api/rooms`, {
    headers: bearer(token),
    data: payload,
  });

  const text = await res.text();
  const body = parseJsonSafe(text);
  const roomId = extractRoomId(body);

  return { res, text, body, roomId };
}

async function deleteRoomIgnoreError(request, token, roomId) {
  if (!roomId) return;
  try {
    await request.delete(`${API_BASE_URL}/api/rooms/${roomId}`, {
      headers: bearer(token),
    });
  } catch {
    // ignore cleanup errors
  }
}

test.describe("Rooms management API", () => {
  test("POST /api/rooms blocked without token", async ({ request }) => {
    const res = await request.post(`${API_BASE_URL}/api/rooms`, {
      data: roomPayloadFromEnvOrDefault(),
    });

    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/rooms should create room", async ({ request }) => {
    const token = await loginAndGetToken(request);
    const payload = roomPayloadFromEnvOrDefault();

    const { res, text, roomId } = await createRoom(request, token, payload);

    expect([200, 201]).toContain(res.status());

    // ถ้า backend คืน id มา จะดีมาก เพราะใช้ต่อใน update/delete ได้
    expect(roomId, `Create room succeeded but room id not found in response: ${text}`).toBeTruthy();

    await deleteRoomIgnoreError(request, token, roomId);
  });

  test("PUT /api/rooms/:room_id should update room", async ({ request }) => {
    const token = await loginAndGetToken(request);
    const createPayload = roomPayloadFromEnvOrDefault();

    const created = await createRoom(request, token, createPayload);
    expect([200, 201]).toContain(created.res.status());

    const roomId = created.roomId || process.env.TEST_ROOM_ID;
    test.skip(!roomId, "No room id from create response and TEST_ROOM_ID is not set");

    const updatePayload = roomUpdatePayloadFromBase(createPayload);

    const res = await request.put(`${API_BASE_URL}/api/rooms/${roomId}`, {
      headers: bearer(token),
      data: updatePayload,
    });

    const text = await res.text();

    expect(
      [200, 204].includes(res.status()),
      `Update room failed. status=${res.status()} body=${text}`
    ).toBeTruthy();

    await deleteRoomIgnoreError(request, token, created.roomId);
  });

  test("DELETE /api/rooms/:room_id should delete room", async ({ request }) => {
    const token = await loginAndGetToken(request);
    const createPayload = roomPayloadFromEnvOrDefault();

    const created = await createRoom(request, token, createPayload);
    expect([200, 201]).toContain(created.res.status());

    const roomId = created.roomId || process.env.TEST_ROOM_ID;
    test.skip(!roomId, "No room id from create response and TEST_ROOM_ID is not set");

    const res = await request.delete(`${API_BASE_URL}/api/rooms/${roomId}`, {
      headers: bearer(token),
    });

    const text = await res.text();

    expect(
      [200, 204].includes(res.status()),
      `Delete room failed. status=${res.status()} body=${text}`
    ).toBeTruthy();
  });
});