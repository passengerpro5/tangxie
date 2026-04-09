function buildUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function readJsonResponse(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function readJsonText(text) {
  return text ? JSON.parse(text) : null;
}

async function requestJson(fetchImpl, transport, baseUrl, path, init) {
  const url = buildUrl(baseUrl, path);
  const headers = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  };

  if (transport) {
    const response = await transport.request({
      url,
      method: init?.method ?? "GET",
      headers,
      body: typeof init?.body === "string" ? init.body : undefined,
    });

    const payload = readJsonText(response.body);
    if (response.status < 200 || response.status >= 300) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String(payload.message ?? "Request failed")
          : `Request failed with ${response.status}`;
      throw new Error(message);
    }

    return payload;
  }

  const response = await fetchImpl(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = await readJsonResponse(response);
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message ?? "Request failed")
        : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return await readJsonResponse(response);
}

export function createMiniProgramApiClient(options) {
  const transport = options.transport;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);

  if (!fetchImpl && !transport) {
    throw new Error("No request transport available");
  }

  return {
    intakeTask(payload) {
      return requestJson(fetchImpl, transport, options.baseUrl, "/tasks/intake", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    replyClarification(payload) {
      return requestJson(fetchImpl, transport, options.baseUrl, "/clarification/reply", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    proposeSchedule(payload) {
      return requestJson(fetchImpl, transport, options.baseUrl, "/scheduling/propose", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    confirmSchedule(payload) {
      return requestJson(fetchImpl, transport, options.baseUrl, "/scheduling/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    generateReminders(payload = {}) {
      return requestJson(fetchImpl, transport, options.baseUrl, "/reminders/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    getDailySummary(date) {
      const suffix = date ? `?date=${encodeURIComponent(date)}` : "";
      return requestJson(fetchImpl, transport, options.baseUrl, `/reminders/daily-summary${suffix}`, {
        method: "GET",
      });
    },
  };
}
