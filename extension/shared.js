// Shared between background.js (service worker) and popup.js — Manifest V3
// service workers support ES modules, so this avoids duplicating the
// notification-fetch logic in two places.

const DEFAULT_API_BASE = "http://localhost:3000";

export async function getConnection() {
  const { token, apiBase } = await chrome.storage.local.get(["token", "apiBase"]);
  return { token: token ?? null, apiBase: apiBase ?? DEFAULT_API_BASE };
}

export async function setConnection(token, apiBase) {
  await chrome.storage.local.set({ token, apiBase: apiBase || DEFAULT_API_BASE });
}

export async function disconnect() {
  await chrome.storage.local.remove(["token", "apiBase"]);
}

function messageFor(notification) {
  const { type, payload } = notification;
  if (type === "challenge_received") return "You've been challenged to a quiz!";
  if (type === "challenge_result")
    return `Result in: you ${payload?.yourScore ?? "?"} - ${payload?.opponentScore ?? "?"} them`;
  if (type === "streak_reminder") return "Keep your streak going — play today's quiz!";
  if (type === "scheduled_quiz") return "A new quiz just dropped.";
  return "You have a new ilmaQuest notification.";
}

// Fetches unread notifications, shows a native notification for each, and
// marks them read so they aren't shown again on the next poll. Returns the
// count shown, mainly so the popup can display "Checked — 2 new".
export async function checkNotifications() {
  const { token, apiBase } = await getConnection();
  if (!token) return 0;

  let notifications = [];
  try {
    const res = await fetch(`${apiBase}/api/extension/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    notifications = data.notifications ?? [];
  } catch {
    return 0; // offline or server unreachable — just skip this poll
  }

  for (const n of notifications) {
    chrome.notifications.create(n.id, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon128.png"),
      title: "ilmaQuest",
      message: messageFor(n),
    });
    await fetch(`${apiBase}/api/extension/notifications/${n.id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  return notifications.length;
}
