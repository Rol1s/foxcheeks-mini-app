const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const stepSets = {
  tattoo: ["Услуга", "Идея", "Место и размер", "Стиль и цвет", "Референсы", "Комментарий", "Дата и время"],
  cover: [
    "Услуга",
    "Фото",
    "Место и размер",
    "Возраст",
    "Плотность",
    "Что изменить",
    "Новая идея",
    "Референсы",
    "Адаптация",
    "Лазер",
    "Комментарий",
    "Дата и время",
  ],
};

const state = {
  step: 0,
  colorHint: "чёрно-белая",
  files: [],
  coverPhotos: [],
  coverReferences: [],
  selectedDate: "",
  selectedTime: "",
  coverSelectedDate: "",
  coverSelectedTime: "",
  requests: JSON.parse(localStorage.getItem("tattooRequests") || "[]"),
};

const form = document.querySelector("#requestForm");
const summaryPanel = document.querySelector("#summaryPanel");
const summaryContent = document.querySelector("#summaryContent");
const nextButton = document.querySelector("#nextButton");
const backButton = document.querySelector("#backButton");
const sendButton = document.querySelector("#sendButton");
const editButton = document.querySelector("#editButton");
const progressBar = document.querySelector("#progressBar");
const stepNow = document.querySelector("#stepNow");
const stepTotal = document.querySelector("#stepTotal");
const stepTitle = document.querySelector("#stepTitle");
const greeting = document.querySelector("#greeting");
const fileInput = document.querySelector("#references");
const fileList = document.querySelector("#fileList");
const coverPhotoInput = document.querySelector("#coverPhoto");
const coverPhotoList = document.querySelector("#coverPhotoList");
const coverReferenceInput = document.querySelector("#coverReferences");
const coverReferenceList = document.querySelector("#coverReferenceList");
const requestsList = document.querySelector("#requestsList");
const dateGrid = document.querySelector("#dateGrid");
const timeGrid = document.querySelector("#timeGrid");
const coverDateGrid = document.querySelector("#coverDateGrid");
const coverTimeGrid = document.querySelector("#coverTimeGrid");

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

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFlow() {
  const selected = new FormData(form).get("service");
  return selected === "Перекрытие" ? "cover" : "tattoo";
}

function getSteps() {
  return stepSets[getFlow()];
}

function fileNames(files, emptyText) {
  return files.length ? files.map((file) => file.name).join(", ") : emptyText;
}

function renderSlotGroup(targetDateGrid, targetTimeGrid, flow) {
  targetDateGrid.innerHTML = dateOptions
    .map(
      (item, index) => `
        <button class="slot-button ${index === 0 ? "active" : ""}" type="button" data-flow="${flow}" data-date="${item.day}, ${item.date}">
          ${item.day}<small>${item.date}</small>
        </button>
      `,
    )
    .join("");
  targetTimeGrid.innerHTML = timeOptions
    .map(
      (time, index) => `
        <button class="slot-button ${index === 0 ? "active" : ""}" type="button" data-flow="${flow}" data-time="${time}">
          ${time}
        </button>
      `,
    )
    .join("");
}

function renderSlots() {
  renderSlotGroup(dateGrid, timeGrid, "tattoo");
  renderSlotGroup(coverDateGrid, coverTimeGrid, "cover");
  state.selectedDate = `${dateOptions[0].day}, ${dateOptions[0].date}`;
  state.selectedTime = timeOptions[0];
  state.coverSelectedDate = state.selectedDate;
  state.coverSelectedTime = state.selectedTime;
}

function saveRequests() {
  localStorage.setItem("tattooRequests", JSON.stringify(state.requests));
}

function collectFormData() {
  const data = new FormData(form);
  const service = data.get("service") || "Татуировка";
  const isCover = service === "Перекрытие";
  const tattooDesiredNote = data.get("desiredTimeNote");
  const coverDesiredNote = data.get("coverDesiredTimeNote");

  if (isCover) {
    const desiredTime = [state.coverSelectedDate, state.coverSelectedTime, coverDesiredNote].filter(Boolean).join(" · ");
    return {
      id: Date.now(),
      createdAt: new Date().toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" }),
      client: clientName,
      service,
      idea: data.get("coverResult") || "Не указано",
      placementSize: data.get("coverPlacementSize") || "Не указано",
      styleColor: data.get("coverDensity") || "Не указано",
      references: fileNames(state.coverReferences, "Референсов нет"),
      comment: data.get("coverComment") || "Не указано",
      desiredTime: desiredTime || "Не указано",
      coverPhoto: fileNames(state.coverPhotos, "Фото текущей тату не добавлены"),
      coverAge: data.get("coverAge") || "Не указано",
      coverDensity: data.get("coverDensity") || "Не указано",
      coverProblem: data.get("coverProblem") || "Не указано",
      coverAdaptation: data.get("coverAdaptation") || "Не указано",
      coverLaser: data.get("coverLaser") || "Не указано",
    };
  }

  const styleColor = [data.get("styleColor"), state.colorHint].filter(Boolean).join(" · ");
  const desiredTime = [state.selectedDate, state.selectedTime, tattooDesiredNote].filter(Boolean).join(" · ");
  return {
    id: Date.now(),
    createdAt: new Date().toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" }),
    client: clientName,
    service,
    idea: data.get("idea") || "Не указано",
    placementSize: data.get("placementSize") || "Не указано",
    styleColor: styleColor || "Не указано",
    references: fileNames(state.files, "Референсов нет"),
    comment: data.get("comment") || "Не указано",
    desiredTime: desiredTime || "Не указано",
  };
}

function renderSummary() {
  const request = collectFormData();
  const rows =
    request.service === "Перекрытие"
      ? [
          ["Услуга", request.service],
          ["Фото текущей тату", request.coverPhoto],
          ["Место и размер", request.placementSize],
          ["Возраст тату", request.coverAge],
          ["Цвет / плотность", request.coverDensity],
          ["Что не устраивает", request.coverProblem],
          ["Желаемый результат", request.idea],
          ["Референсы новой идеи", request.references],
          ["Адаптация идеи", request.coverAdaptation],
          ["Лазер / осветление", request.coverLaser],
          ["Комментарий", request.comment],
          ["Дата и время", request.desiredTime],
        ]
      : [
          ["Услуга", request.service],
          ["Идея", request.idea],
          ["Место и размер", request.placementSize],
          ["Стиль и цвет", request.styleColor],
          ["Референсы", request.references],
          ["Комментарий", request.comment],
          ["Дата и время", request.desiredTime],
        ];

  summaryContent.innerHTML = `
    <dl>
      ${rows.map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join("")}
    </dl>
  `;
  return request;
}

function updateStep() {
  const flow = getFlow();
  const steps = getSteps();
  if (state.step > steps.length - 1) state.step = steps.length - 1;

  const previousStep = document.querySelector(".form-step.active");
  document.querySelectorAll(".form-step").forEach((step) => {
    const stepFlow = step.dataset.flow || "tattoo";
    const isFlowMatch = stepFlow === "both" || stepFlow === flow;
    step.classList.toggle("active", isFlowMatch && Number(step.dataset.step) === state.step);
  });
  const activeStep = document.querySelector(".form-step.active");
  if (previousStep && activeStep && previousStep !== activeStep) {
    activeStep.classList.remove("step-pulse");
    void activeStep.offsetWidth;
    activeStep.classList.add("step-pulse");
  }

  stepNow.textContent = String(state.step + 1);
  stepTotal.textContent = String(steps.length);
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

function requestPreviewText(request) {
  return request.service === "Перекрытие" ? request.coverProblem : request.idea;
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
          <h3>${escapeHTML(request.service)} · ${escapeHTML(request.createdAt)}</h3>
          <p>${escapeHTML(requestPreviewText(request))}</p>
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
    const input = card.querySelector("input");
    if (!input) return;
    const group = input.name;
    document.querySelectorAll(`input[name="${group}"]`).forEach((item) => {
      item.closest(".choice-card")?.classList.remove("active");
    });
    card.classList.add("active");
    input.checked = true;
    if (group === "service") {
      state.step = 0;
      updateStep();
    }
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
  fileList.textContent = fileNames(state.files, "Референсы пока не добавлены");
});

coverPhotoInput.addEventListener("change", () => {
  state.coverPhotos = [...coverPhotoInput.files];
  coverPhotoList.textContent = fileNames(state.coverPhotos, "Фото текущей тату пока не добавлены");
});

coverReferenceInput.addEventListener("change", () => {
  state.coverReferences = [...coverReferenceInput.files];
  coverReferenceList.textContent = fileNames(state.coverReferences, "Референсы пока не добавлены");
});

function handleSlotClick(event) {
  const button = event.target.closest("[data-date], [data-time]");
  if (!button) return;
  const grid = button.parentElement;
  grid.querySelectorAll(".slot-button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  const flow = button.dataset.flow;
  if (button.dataset.date) {
    if (flow === "cover") state.coverSelectedDate = button.dataset.date;
    else state.selectedDate = button.dataset.date;
  }
  if (button.dataset.time) {
    if (flow === "cover") state.coverSelectedTime = button.dataset.time;
    else state.selectedTime = button.dataset.time;
  }
}

dateGrid.addEventListener("click", handleSlotClick);
timeGrid.addEventListener("click", handleSlotClick);
coverDateGrid.addEventListener("click", handleSlotClick);
coverTimeGrid.addEventListener("click", handleSlotClick);

nextButton.addEventListener("click", () => {
  const steps = getSteps();
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
      <p>Спасибо, заявка передана мастеру. foxcheeks посмотрит детали, оценит идею и напишет вам, чтобы согласовать запись и уточнить нюансы.</p>
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
    document.querySelectorAll(".choice-card").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".choice-card input:checked").forEach((input) => input.closest(".choice-card")?.classList.add("active"));
    state.files = [];
    state.coverPhotos = [];
    state.coverReferences = [];
    state.step = 0;
    state.colorHint = "чёрно-белая";
    fileList.textContent = "Референсы пока не добавлены";
    coverPhotoList.textContent = "Фото текущей тату пока не добавлены";
    coverReferenceList.textContent = "Референсы пока не добавлены";
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
    const lines =
      request.service === "Перекрытие"
        ? [
            `Услуга: ${request.service}`,
            `Фото текущей тату: ${request.coverPhoto}`,
            `Место и размер: ${request.placementSize}`,
            `Возраст: ${request.coverAge}`,
            `Плотность: ${request.coverDensity}`,
            `Что изменить: ${request.coverProblem}`,
            `Новая идея: ${request.idea}`,
            `Дата и время: ${request.desiredTime}`,
          ]
        : [
            `Услуга: ${request.service}`,
            `Идея: ${request.idea}`,
            `Место и размер: ${request.placementSize}`,
            `Стиль и цвет: ${request.styleColor}`,
            `Дата и время: ${request.desiredTime}`,
          ];
    alert(lines.join("\n"));
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
