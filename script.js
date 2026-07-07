// ============================================================
// Tun-Tun-Tun Sahur — interactions
// ============================================================

document.getElementById("year").textContent = new Date().getFullYear();

// ---------------- header glass state ----------------
const header = document.getElementById("siteHeader");
function updateHeader() {
  header.classList.toggle("scrolled", window.scrollY > 40);
}
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

// ---------------- reveal on scroll ----------------
const revealEls = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
);
revealEls.forEach((el) => revealObserver.observe(el));

// ---------------- count-up numbers ----------------
const countEls = document.querySelectorAll("[data-count]");
const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const duration = 900;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.round(target * eased).toLocaleString("uk-UA");
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      countObserver.unobserve(el);
    });
  },
  { threshold: 0.5 }
);
countEls.forEach((el) => countObserver.observe(el));

// ---------------- hero parallax ----------------
const heroBg = document.querySelector("[data-parallax]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (heroBg && !prefersReducedMotion) {
  window.addEventListener(
    "scroll",
    () => {
      const offset = window.scrollY * 0.08;
      heroBg.style.transform = `translateY(${offset}px)`;
    },
    { passive: true }
  );
}

// ---------------- custom cursor companion (desktop only) ----------------
const cursorDot = document.getElementById("cursorDot");
const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (cursorDot && isFinePointer && !prefersReducedMotion) {
  let mouseX = 0, mouseY = 0, dotX = 0, dotY = 0;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.classList.add("visible");
  });

  document.addEventListener("mouseleave", () => cursorDot.classList.remove("visible"));

  function followCursor() {
    dotX += (mouseX - dotX) * 0.2;
    dotY += (mouseY - dotY) * 0.2;
    cursorDot.style.left = dotX + "px";
    cursorDot.style.top = dotY + "px";
    requestAnimationFrame(followCursor);
  }
  followCursor();

  document.querySelectorAll(".hoverable").forEach((el) => {
    el.addEventListener("mouseenter", () => cursorDot.classList.add("hover"));
    el.addEventListener("mouseleave", () => cursorDot.classList.remove("hover"));
  });
}

// ============================================================
// BOOKING WIZARD
// ------------------------------------------------------------
// Записи зберігаються в справжній базі даних Supabase (Postgres).
// Захист від подвійного бронювання одного часу забезпечує UNIQUE
// constraint на рівні бази (master_id + booking_date + booking_time) —
// це надійно навіть якщо двоє клієнтів тиснуть "Підтвердити" одночасно.
// ============================================================

const SUPABASE_URL = "https://vsxjkesquejivthxxqip.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AfHHxs19RkbGhEpflXzz8w_o31XTG99";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SERVICES = [
  { id: "men", name: "Чоловіча стрижка", price: "450 грн", duration: "40 хв" },
  { id: "combo", name: "Стрижка + борода", price: "700 грн", duration: "65 хв" },
  { id: "shave", name: "Гоління", price: "500 грн", duration: "45 хв" },
  { id: "kids", name: "Дитяча стрижка", price: "300 грн", duration: "30 хв" },
];

const MASTERS = [
  { id: "oleksandr", name: "Олександр", spec: "Класика та фейд" },
  { id: "maksym", name: "Максим", spec: "Бороди та гоління" },
  { id: "dmytro", name: "Дмитро", spec: "Дитячі стрижки" },
];

// day of week (0 = Sun) -> [openHour, closeHour] or null if closed
const WORK_HOURS = {
  0: null,
  1: [10, 20],
  2: [10, 20],
  3: [10, 20],
  4: [10, 20],
  5: [10, 21],
  6: [11, 19],
};

const MONTH_NAMES = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
];
const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

const bookingState = {
  step: 1,
  service: null,
  master: null,
  date: null, // ISO yyyy-mm-dd
  time: null,
  calendarCursor: new Date(),
};

function toISODate(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function isPastDate(d) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

// ---------------- open / close ----------------
function openBooking() {
  bookingState.step = 1;
  bookingState.service = null;
  bookingState.master = null;
  bookingState.date = null;
  bookingState.time = null;
  bookingState.calendarCursor = new Date();

  document.getElementById("fFirstName").value = "";
  document.getElementById("fLastName").value = "";
  document.getElementById("fPhone").value = "";
  document.getElementById("bookingMsg").textContent = "";
  document.getElementById("bookingMsg").className = "booking-msg";

  renderServiceList();
  renderMasterList();

  document.getElementById("bookingOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  showBookingStep(1);
}

function closeBooking() {
  document.getElementById("bookingOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("bookingOverlay").addEventListener("click", (e) => {
  if (e.target.id === "bookingOverlay") closeBooking();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeBooking();
});

// ---------------- step control ----------------
const STEP_TITLES = {
  1: "Оберіть послугу",
  2: "Оберіть майстра",
  3: "Оберіть дату",
  4: "Оберіть час",
  5: "Ваші дані",
  6: "Готово",
};

function showBookingStep(n) {
  bookingState.step = n;
  document.getElementById("bookingTitle").textContent = STEP_TITLES[n];

  document.querySelectorAll(".booking-step").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.step) === n);
  });

  const dots = document.querySelectorAll("[data-dot]");
  dots.forEach((dot, i) => dot.classList.toggle("done", i < Math.min(n, 5)));

  renderBookingActions();
}

function renderBookingActions() {
  const actions = document.getElementById("bookingActions");
  const n = bookingState.step;

  if (n === 6) {
    actions.innerHTML = `<button class="btn btn-accent" onclick="closeBooking()">Закрити</button>`;
    return;
  }

  const back = n > 1 ? `<button class="btn btn-ghost" onclick="bookingGoBack()">Назад</button>` : "";

  if (n === 5) {
    actions.innerHTML = back + `<button class="btn btn-accent" id="confirmBtn" onclick="confirmBooking()">Підтвердити запис</button>`;
  } else {
    actions.innerHTML = back;
  }
}

function bookingGoBack() {
  showBookingStep(bookingState.step - 1);
}

// ---------------- step 1: service ----------------
function renderServiceList() {
  document.getElementById("serviceList").innerHTML = SERVICES.map(
    (s) => `
    <button class="opt-btn" onclick="selectService('${s.id}')">
      <span class="opt-title">${s.name}</span>
      <span class="opt-meta">${s.price} · ${s.duration}</span>
    </button>
  `
  ).join("");
}

function selectService(id) {
  bookingState.service = SERVICES.find((s) => s.id === id);
  showBookingStep(2);
}

// ---------------- step 2: master ----------------
function renderMasterList() {
  document.getElementById("masterList").innerHTML = MASTERS.map(
    (m) => `
    <div class="master-select-card" onclick="selectMaster('${m.id}')">
      <div class="thumb">ФОТО</div>
      <div>
        <div class="name">${m.name}</div>
        <div class="spec">${m.spec}</div>
      </div>
    </div>
  `
  ).join("");
}

function selectMaster(id) {
  bookingState.master = MASTERS.find((m) => m.id === id);
  bookingState.calendarCursor = new Date();
  renderCalendar();
  showBookingStep(3);
}

// ---------------- step 3: calendar ----------------
function shiftMonth(delta) {
  const c = bookingState.calendarCursor;
  bookingState.calendarCursor = new Date(c.getFullYear(), c.getMonth() + delta, 1);
  renderCalendar();
}

function renderCalendar() {
  const cursor = bookingState.calendarCursor;
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  document.getElementById("calendarMonth").textContent = `${MONTH_NAMES[month]} ${year}`;
  document.getElementById("calendarWeekdays").innerHTML = WEEKDAY_LABELS.map((d) => `<span>${d}</span>`).join("");

  const firstDay = new Date(year, month, 1);
  // convert JS Sunday=0 to Monday-first index
  const leadingEmpty = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = "";
  for (let i = 0; i < leadingEmpty; i++) {
    html += `<div class="cal-day empty"></div>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const iso = toISODate(d);
    const closed = WORK_HOURS[d.getDay()] === null;
    const disabled = isPastDate(d) || closed;
    const selected = bookingState.date === iso;
    html += `
      <button class="cal-day ${selected ? "selected" : ""}" ${disabled ? "disabled" : ""} onclick="selectDate('${iso}')">
        ${day}
      </button>
    `;
  }
  document.getElementById("calendarGrid").innerHTML = html;
}

function selectDate(iso) {
  bookingState.date = iso;
  renderCalendar();
  renderTimeList();
  showBookingStep(4);
}

// ---------------- step 4: time ----------------
async function renderTimeList() {
  const container = document.getElementById("timeList");
  const d = new Date(bookingState.date + "T00:00:00");
  const hours = WORK_HOURS[d.getDay()];

  if (!hours) {
    container.innerHTML = `<p class="body-text muted">Цього дня майстер не працює.</p>`;
    return;
  }

  container.innerHTML = `<p class="body-text muted">Завантаження…</p>`;

  const { data, error } = await supabaseClient
    .from("public_slots")
    .select("booking_time")
    .eq("master_id", bookingState.master.id)
    .eq("booking_date", bookingState.date);

  if (error) {
    container.innerHTML = `<p class="body-text muted">Не вдалося завантажити час. Спробуйте ще раз.</p>`;
    console.error(error);
    return;
  }

  const taken = new Set((data || []).map((r) => r.booking_time.slice(0, 5)));

  const [open, close] = hours;
  let html = "";
  for (let h = open; h < close; h++) {
    const time = String(h).padStart(2, "0") + ":00";
    const isTaken = taken.has(time);
    html += `
      <button class="time-btn ${bookingState.time === time ? "selected" : ""}" ${isTaken ? "disabled" : ""} onclick="selectTime('${time}')">
        ${time}
      </button>
    `;
  }
  container.innerHTML = html;
}

function selectTime(time) {
  bookingState.time = time;
  renderSummary();
  showBookingStep(5);
}

// ---------------- step 5: contact + confirm ----------------
function renderSummary() {
  const d = new Date(bookingState.date + "T00:00:00");
  const dateLabel = d.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
  document.getElementById("bookingSummary").innerHTML = `
    <b>${bookingState.service.name}</b> · ${bookingState.service.price}<br>
    Майстер: ${bookingState.master.name}<br>
    ${dateLabel}, ${bookingState.time}
  `;
}

async function confirmBooking() {
  const firstName = document.getElementById("fFirstName").value.trim();
  const lastName = document.getElementById("fLastName").value.trim();
  const phone = document.getElementById("fPhone").value.trim();
  const msgEl = document.getElementById("bookingMsg");
  const confirmBtn = document.getElementById("confirmBtn");

  if (!firstName || !lastName || !phone) {
    msgEl.className = "booking-msg error";
    msgEl.textContent = "Заповніть, будь ласка, усі поля.";
    return;
  }

  confirmBtn.disabled = true;
  confirmBtn.textContent = "Збереження…";
  msgEl.className = "booking-msg";
  msgEl.textContent = "";

  const { error } = await supabaseClient.from("bookings").insert([{
    service_id: bookingState.service.id,
    service_name: bookingState.service.name,
    master_id: bookingState.master.id,
    master_name: bookingState.master.name,
    booking_date: bookingState.date,
    booking_time: bookingState.time,
    first_name: firstName,
    last_name: lastName,
    phone: phone,
  }]);

  confirmBtn.disabled = false;
  confirmBtn.textContent = "Підтвердити запис";

  if (error) {
    if (error.code === "23505") {
      // порушення UNIQUE constraint — хтось щойно зайняв цей самий час
      msgEl.className = "booking-msg error";
      msgEl.textContent = "На жаль, цей час щойно зайняли. Оберіть інший.";
      await renderTimeList();
      showBookingStep(4);
    } else {
      msgEl.className = "booking-msg error";
      msgEl.textContent = "Щось пішло не так. Спробуйте ще раз.";
      console.error(error);
    }
    return;
  }

  const d = new Date(bookingState.date + "T00:00:00");
  const dateLabel = d.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
  document.getElementById("bookingSummaryFinal").innerHTML = `
    <b>${bookingState.service.name}</b><br>
    Майстер: ${bookingState.master.name}<br>
    ${dateLabel}, ${bookingState.time}
  `;

  showBookingStep(6);
}
