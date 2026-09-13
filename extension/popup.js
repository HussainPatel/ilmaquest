import { getConnection, setConnection, disconnect, checkNotifications } from "./shared.js";

const disconnectedView = document.getElementById("disconnected-view");
const connectedView = document.getElementById("connected-view");
const statusEl = document.getElementById("status");

async function render() {
  const { token, apiBase } = await getConnection();
  if (token) {
    disconnectedView.style.display = "none";
    connectedView.style.display = "block";
  } else {
    disconnectedView.style.display = "block";
    connectedView.style.display = "none";
    document.getElementById("open-connect-link").href = `${apiBase}/extension/connect`;
  }
}

document.getElementById("open-connect-link").addEventListener("click", async (e) => {
  e.preventDefault();
  const { apiBase } = await getConnection();
  chrome.tabs.create({ url: `${apiBase}/extension/connect` });
});

document.getElementById("connect-btn").addEventListener("click", async () => {
  const token = document.getElementById("token-input").value.trim();
  const apiBase = document.getElementById("apibase-input").value.trim();
  if (!token) return;
  await setConnection(token, apiBase);
  await render();
});

document.getElementById("disconnect-btn").addEventListener("click", async () => {
  await disconnect();
  await render();
});

document.getElementById("open-app-btn").addEventListener("click", async () => {
  const { apiBase } = await getConnection();
  chrome.tabs.create({ url: `${apiBase}/challenges` });
});

document.getElementById("check-now-btn").addEventListener("click", async () => {
  statusEl.textContent = "Checking…";
  const count = await checkNotifications();
  statusEl.textContent = count > 0 ? `${count} new notification(s)` : "No new notifications";
});

render();
