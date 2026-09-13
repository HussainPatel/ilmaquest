import { checkNotifications } from "./shared.js";

const ALARM_NAME = "ilmaquest-check-notifications";

// docs/ARCHITECTURE.md calls for ~15 min in real use; every 5 min here is a
// reasonable middle ground for early testing without hammering the API.
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkNotifications();
  }
});

// Clicking a shown notification opens the challenges page.
chrome.notifications.onClicked.addListener(async () => {
  const { apiBase } = await chrome.storage.local.get("apiBase");
  chrome.tabs.create({ url: `${apiBase ?? "http://localhost:3000"}/challenges` });
});
