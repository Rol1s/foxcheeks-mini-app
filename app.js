const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const state = {
  step: 0,
  colorHint: "чёрно-белая",
  files: [],
  selectedDate: "",
  selectedTime: "",
  requests: JSON.parse(localStorage.getItem("tattooRequests") || "[]"),
};

const steps = [
  "Услуга",
  "Идея",
  "Место и размер",
  "Стиль и цвет",
  "Референсы",
  "Комментарий",
  "Дата и время",
];

const form = document.querySelector("#requestForm");
const summaryPanel = document.querySelector("#summaryPanel");
const summaryContent = document.querySelector("#summaryContent");
const nextButton = document.querySelector("#nextButton");
const backButton = document.querySelector("#backButton");
const sendButton = document.querySelector("#sendButton");
const editButton = document.querySelector("#editButton");
const progressBar = document.querySelector("#progressBar");
const stepNow = document.querySelector("#stepNow");
const stepTitle = document.querySelector("#stepTitle");
const greeting = document.querySelector("#greeting");
const fileInput = document.querySelector("#references");
const fileList = document.querySelector("#fileList");
const requestsList = document.querySelector("#requestsList");
const dateGrid = document.querySelector("#dateGrid");
const timeGrid = document.querySelector("#timeGrid");

const urlParams = new URLSearchParams(window.location.search);
const user = tg?.initDataUnsafe?.user;
const telegramName = user?.username ? `@${user.username}` : user?.first_name;
const demoName = urlParams.get("username");
const clientName = demoName ? `@${demoName.replace(/^@/, "")}` : telegramName || "клиент";
greeting.textContent = `Привет, ${clientName}`;

const dateOptions = [
  { day: "Вт", date: "21 мая" },
  { day: "Ср", date: "22 мая" },
  { day: "Пт", date: "24 мая" },
  { day: "Сб", date: "25 мая" },
  { day: "Вс", date: "26 мая" },
  { day: "Любой", date: "по согласованию" },
];

const timeOptions = ["11:00", "13:00", "15:00", "17:00", "18:30", "19:30", "Любое", "Напишу"];

function renderSlots() {
  dateGrid.innerHTML = dateOptions
    .map(
      (item, index) => `
        <button class="slot-button ${index === 0 ? "active" : ""}" type="button" data-date="${item.day}, ${item.date}">
          ${item.day}<small>${item.date}</small>
        </button>
      `,
    )
    .join("");
  timeGrid.innerHTML = timeOptions
    .map(
      (time, index) => `
        <button class="slot-button ${index === 0 ? "active" : ""}" type="button" data-time="${time}">
          ${time}
        </button>
      `,
    )
    .join("");
  state.selectedDate = `${dateOptions[0].day}, ${dateOptions[0].date}`;
  state.selectedTime = timeOptions[0];
}

function saveRequests() {
  localStorage.setItem("tattooRequests", JSON.stringify(state.requests));
}

function collectFormData() {
  const data = new FormData(form);
  const styleColor = [data.get("styleColor"), state.colorHint].filter(Boolean).join(" · ");
  const desiredNote = data.get("desiredTimeNote");
  const desiredTime = [state.selectedDate, state.selectedTime, desiredNote].filter(Boolean).join(" · ");
  return {
    id: Date.now(),
    createdAt: new Date().toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" }),
    client: clientName,
    service: data.get("service") || "Татуировка",
    idea: data.get("idea") || "Не указано",
    placementSize: data.get("placementSize") || "Не указано",
    styleColor: styleColor || "Не указано",
    references: state.files.length ? state.files.map((file) => file.name).join(", ") : "Референсов нет",
    comment: data.get("comment") || "Не указано",
    desiredTime: desiredTime || "Не указано",
  };
}

function renderSummary() {
  const request = collectFormData();
  summaryContent.innerHTML = `
    <dl>
      <div><dt>Услуга</dt><dd>${request.service}</dd></div>
      <div><dt>Идея</dt><dd>${request.idea}</dd></div>
      <div><dt>Место и размер</dt><dd>${request.placementSize}</dd></div>
      <div><dt>Стиль и цвет</dt><dd>${request.styleColor}</dd></div>
      <div><dt>Референсы</dt><dd>${request.references}</dd></div>
      <div><dt>Комментарий</dt><dd>${request.comment}</dd></div>
      <div><dt>Дата и время</dt><dd>${request.desiredTime}</dd></div>
    </dl>
  `;
  return request;
}

function updateStep() {
  const previousStep = document.querySelector(".form-step.active");
  document.querySelectorAll(".form-step").forEach((step, index) => {
    step.classList.toggle("active", index === state.step);
  });
  const activeStep = document.querySelector(".form-step.active");
  if (previousStep && activeStep && previousStep !== activeStep) {
    activeStep.classList.remove("step-pulse");
    void activeStep.offsetWidth;
    activeStep.classList.add("step-pulse");
  }
  stepNow.textContent = String(state.step + 1);
  stepTitle.textContent = steps[state.step];
  progressBar.style.width = `${((state.step + 1) / steps.length) * 100}%`;
  backButton.disabled = state.step === 0;
  nextButton.textContent = state.step === steps.length - 1 ? "Проверить" : "Продолжить";
  summaryPanel.classList.remove("active");
  form.style.display = "block";
  document.querySelector(".progress-card").style.display = "grid";
  document.querySelector(".bottom-bar").style.display = "grid";
}

function showSummary() {
  renderSummary();
  form.style.display = "none";
  document.querySelector(".progress-card").style.display = "none";
  document.querySelector(".bottom-bar").style.display = "none";
  summaryPanel.classList.add("active");
}

function renderRequests() {
  if (!state.requests.length) {
    requestsList.innerHTML = `<div class="request-card"><h3>Заявок пока нет</h3><p>После отправки первая заявка появится здесь.</p></div>`;
    return;
  }

  requestsList.innerHTML = state.requests
    .map(
      (request) => `
        <article class="request-card">
          <h3>${request.service} · ${request.createdAt}</h3>
          <p>${request.idea}</p>
          <div class="request-card-actions">
            <button class="secondary-button" type="button" data-open-request="${request.id}">Посмотреть</button>
            <button class="secondary-button" type="button" data-delete-request="${request.id}">Удалить</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function switchView(name) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${name}View`).classList.add("active");
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === name);
  });
  document.querySelector(".bottom-bar").style.display = name === "form" && !summaryPanel.classList.contains("active") ? "grid" : "none";
  if (name === "requests") renderRequests();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

document.querySelectorAll("[data-view-link]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.viewLink));
});

document.querySelectorAll(".choice-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".choice-card").forEach((item) => item.classList.remove("active"));
    card.classList.add("active");
  });
});

document.querySelectorAll(".segmented button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segmented button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.colorHint = button.dataset.color;
  });
});

fileInput.addEventListener("change", () => {
  state.files = [...fileInput.files];
  fileList.textContent = state.files.length
    ? state.files.map((file) => file.name).join(", ")
    : "Референсы пока не добавлены";
});

dateGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");
  if (!button) return;
  dateGrid.querySelectorAll(".slot-button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  state.selectedDate = button.dataset.date;
});

timeGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-time]");
  if (!button) return;
  timeGrid.querySelectorAll(".slot-button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  state.selectedTime = button.dataset.time;
});

nextButton.addEventListener("click", () => {
  if (state.step < steps.length - 1) {
    state.step += 1;
    updateStep();
    return;
  }
  showSummary();
});

backButton.addEventListener("click", () => {
  if (state.step > 0) {
    state.step -= 1;
    updateStep();
  }
});

editButton.addEventListener("click", () => {
  summaryPanel.classList.remove("active");
  form.style.display = "block";
  document.querySelector(".progress-card").style.display = "grid";
  document.querySelector(".bottom-bar").style.display = "grid";
});

sendButton.addEventListener("click", () => {
  const request = renderSummary();
  state.requests.unshift(request);
  saveRequests();

  const payload = {
    type: "tattoo_request",
    request,
  };

  if (tg) {
    tg.sendData(JSON.stringify(payload));
    tg.HapticFeedback?.notificationOccurred("success");
  }

  summaryPanel.innerHTML = `
    <div class="summary-header"><span>Готово</span><strong>Заявка отправлена</strong></div>
    <div class="summary-content">
      <p>Спасибо! Мастер посмотрит детали и свяжется с вами в ближайшее время.</p>
    </div>
    <div class="summary-actions">
      <button type="button" class="secondary-button" data-view-link="requests">Мои заявки</button>
      <button type="button" class="primary-button" id="againButton">Новая заявка</button>
    </div>
  `;
  summaryPanel.classList.add("active");
  summaryPanel.querySelector("[data-view-link]").addEventListener("click", () => switchView("requests"));
  summaryPanel.querySelector("#againButton").addEventListener("click", () => {
    form.reset();
    state.files = [];
    state.step = 0;
    state.selectedDate = `${dateOptions[0].day}, ${dateOptions[0].date}`;
    state.selectedTime = timeOptions[0];
    fileList.textContent = "Референсы пока не добавлены";
    renderSlots();
    updateStep();
    switchView("form");
  });
});

requestsList.addEventListener("click", (event) => {
  const openId = event.target.dataset.openRequest;
  const deleteId = event.target.dataset.deleteRequest;

  if (openId) {
    const request = state.requests.find((item) => String(item.id) === openId);
    if (!request) return;
    alert(
      [
        `Услуга: ${request.service}`,
        `Идея: ${request.idea}`,
        `Место и размер: ${request.placementSize}`,
        `Стиль и цвет: ${request.styleColor}`,
        `Дата и время: ${request.desiredTime}`,
      ].join("\n"),
    );
  }

  if (deleteId) {
    state.requests = state.requests.filter((item) => String(item.id) !== deleteId);
    saveRequests();
    renderRequests();
  }
});

renderSlots();
updateStep();
renderRequests();
