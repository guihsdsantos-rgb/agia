import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

/* =========================================================
   AGÍA
   Bíblia PDF + Agenda + Pregações + Modo Púlpito
========================================================= */

const KEY = "agia-data-v4";

const PDF_URL = "bible_pdf/biblia.pdf";

const CAL_MIN_YEAR = 2026;
const CAL_MAX_YEAR = 2100;

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

/* =========================================================
   DADOS
========================================================= */

const defaultData = {
  events: [],
  sermons: [],
  pdfInk: {},
  settings: {
    pdfZoom: 1,
    fontSize: 26
  }
};

let data;

try {
  data = JSON.parse(localStorage.getItem(KEY)) || defaultData;
} catch {
  data = structuredClone(defaultData);
}

if (!data.events) data.events = [];
if (!data.sermons) data.sermons = [];
if (!data.pdfInk) data.pdfInk = {};
if (!data.settings) data.settings = {};
if (!data.settings.pdfZoom) data.settings.pdfZoom = 1;
if (!data.settings.fontSize) data.settings.fontSize = 26;

/* =========================================================
   ESTADO
========================================================= */

const now = new Date();

let state = {
  page: "inicio",

  pdfDoc: null,
  pdfPage: 1,
  pdfZoom: data.settings.pdfZoom || 1,
  inkMode: false,

  calendarMonth: now.getMonth(),
  calendarYear: Math.min(
    CAL_MAX_YEAR,
    Math.max(CAL_MIN_YEAR, now.getFullYear())
  ),

  pdfSearchBusy: false,
  pdfSearchResults: [],

  currentSermonId: null
};

/* =========================================================
   UTILIDADES
========================================================= */

function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(text) {
  const el = document.querySelector(".toast");

  if (!el) return;

  el.textContent = text;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 2200);
}

function formatDateBR(dateISO) {
  if (!dateISO) return "";

  const [year, month, day] = dateISO.split("-");

  return `${day}/${month}/${year}`;
}

function todayISO() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

/* =========================================================
   RELÓGIO DE BRASÍLIA
========================================================= */

function brasiliaTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
}

function brasiliaDate() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date());
}

function startClock() {
  clearInterval(window.__agiaClock);

  function update() {
    const time = document.getElementById("agiaClockTime");
    const date = document.getElementById("agiaClockDate");

    if (time) time.textContent = brasiliaTime();
    if (date) date.textContent = `${brasiliaDate()} • Brasília`;
  }

  update();

  window.__agiaClock = setInterval(update, 1000);
}

/* =========================================================
   NAVEGAÇÃO
========================================================= */

function nav(page) {
  state.page = page;

  render();
}

window.nav = nav;

function render() {
  document.getElementById("app").innerHTML = `
    <header class="top">

      <div class="brand" onclick="window.nav('inicio')" style="cursor:pointer">
        <img
          src="icons/agia-logo.png"
          alt="Agía"
          onerror="this.style.display='none';this.nextElementSibling.style.display='block'"
        >
        <span style="display:none">AGÍA</span>
      </div>

      <div class="clock">
        <div id="agiaClockTime" class="clock-time">--:--:--</div>
        <div id="agiaClockDate" class="clock-label">Brasília</div>
      </div>

    </header>

    <div class="layout">

      <nav class="nav">

        ${[
          ["inicio", "⌂ Início"],
          ["pdf", "▤ Bíblia PDF"],
          ["agenda", "□ Agenda"],
          ["pregacoes", "◉ Pregações"],
          ["ferramentas", "⚙ Ferramentas"]
        ]
          .map(
            ([page, text]) => `
              <button
                class="${state.page === page ? "active" : ""}"
                onclick="window.nav('${page}')"
              >
                ${text}
              </button>
            `
          )
          .join("")}

      </nav>

      <main id="main"></main>

    </div>

    <div class="toast"></div>
  `;

  startClock();

  if (state.page === "inicio") home();
  if (state.page === "pdf") pdfPage();
  if (state.page === "agenda") agenda();
  if (state.page === "pregacoes") sermons();
  if (state.page === "ferramentas") tools();
}

/* =========================================================
   INÍCIO
========================================================= */

function home() {
  const nextEvents = [...data.events]
    .filter(event => event.date >= todayISO())
    .sort((a, b) => {
      return `${a.date} ${a.time}`.localeCompare(
        `${b.date} ${b.time}`
      );
    })
    .slice(0, 3);

  document.getElementById("main").innerHTML = `

    <div class="hero">

      <div>
        <h1>Agía</h1>

        <div class="muted">
          Bíblia, agenda e preparação para suas mensagens.
        </div>
      </div>

      <button
        class="btn primary"
        onclick="window.newSermon()"
      >
        + Nova pregação
      </button>

    </div>

    <div class="grid">

      <div class="card">

        <h3>Bíblia PDF</h3>

        <p>
          Leia, pesquise, dê zoom e faça anotações sobre as páginas.
        </p>

        <button
          class="btn primary"
          onclick="window.nav('pdf')"
        >
          Abrir Bíblia
        </button>

      </div>

      <div class="card">

        <h3>Agenda</h3>

        <div class="stat">
          ${data.events.length}
        </div>

        <div class="muted">
          compromissos cadastrados
        </div>

        <br>

        <button
          class="btn"
          onclick="window.nav('agenda')"
        >
          Ver agenda
        </button>

      </div>

      <div class="card">

        <h3>Pregações</h3>

        <div class="stat">
          ${data.sermons.length}
        </div>

        <div class="muted">
          mensagens preparadas
        </div>

        <br>

        <button
          class="btn"
          onclick="window.nav('pregacoes')"
        >
          Minhas pregações
        </button>

      </div>

      <div class="card">

        <h3>Brasília</h3>

        <div class="stat">
          ${brasiliaTime()}
        </div>

        <div class="muted">
          ${brasiliaDate()}
        </div>

      </div>

    </div>

    <div class="divider"></div>

    <h2 class="section-title">
      Próximos compromissos
    </h2>

    <div class="list">

      ${
        nextEvents.length
          ? nextEvents
              .map(
                event => `

                <div class="item">

                  <strong>
                    ${escapeHTML(event.title)}
                  </strong>

                  <div class="muted">
                    ${formatDateBR(event.date)}
                    ${event.time ? ` • ${escapeHTML(event.time)}` : ""}
                    ${event.location ? ` • ${escapeHTML(event.location)}` : ""}
                  </div>

                </div>

              `
              )
              .join("")
          : `
            <div class="card muted">
              Nenhum compromisso futuro cadastrado.
            </div>
          `
      }

    </div>

  `;
}

/* =========================================================
   BÍBLIA PDF
========================================================= */

async function ensurePdfLoaded() {
  if (state.pdfDoc) return state.pdfDoc;

  state.pdfDoc = await pdfjsLib
    .getDocument(PDF_URL)
    .promise;

  return state.pdfDoc;
}

async function pdfPage() {
  document.getElementById("main").innerHTML = `

    <div class="hero">

      <div>

        <h1>Bíblia PDF</h1>

        <div class="muted">
          Leia, pesquise e escreva sobre a Bíblia.
        </div>

      </div>

    </div>

    <div class="card">

      <div class="field">

        <label>Pesquisar no PDF</label>

        <div class="row">

          <input
            id="pdfSearchInput"
            placeholder="Ex.: João 3, Salmos 23, amor, criação..."
            onkeydown="
              if(event.key === 'Enter'){
                window.searchPDF()
              }
            "
          >

          <button
            class="btn primary"
            onclick="window.searchPDF()"
          >
            Pesquisar
          </button>

        </div>

      </div>

      <div id="pdfSearchStatus" class="muted"></div>

      <div id="pdfSearchResults" class="list"></div>

    </div>

    <div class="pdf-toolbar">

      <div class="row">

        <button
          class="btn"
          onclick="window.pdfPrev()"
        >
          ←
        </button>

        <input
          id="pdfPageInput"
          style="width:100px"
          type="number"
          min="1"
          value="${state.pdfPage}"
          onchange="window.pdfGoto(+this.value)"
        >

        <button
          class="btn"
          onclick="window.pdfNext()"
        >
          →
        </button>

      </div>

      <div class="row">

        <button
          class="btn"
          onclick="window.pdfZoom(-0.15)"
        >
          A−
        </button>

        <button
          class="btn"
          onclick="window.pdfZoom(0.15)"
        >
          A+
        </button>

        <button
          class="btn ${state.inkMode ? "primary" : ""}"
          onclick="window.toggleInk()"
        >
          ✎ Caneta
        </button>

        <button
          class="btn"
          onclick="window.clearPdfInk()"
        >
          Limpar
        </button>

      </div>

    </div>

    <div class="pdf-toolbar">

      <span id="pdfInfo">
        Carregando Bíblia...
      </span>

      <span class="muted">
        Página ${state.pdfPage}
      </span>

    </div>

    <div
      id="pdfViewer"
      class="pdfViewer"
    >

      <div class="pdfPage">

        <canvas id="pdfCanvas"></canvas>

        <canvas
          id="pdfInk"
          class="pdfInk ${state.inkMode ? "" : "hidden"}"
        ></canvas>

      </div>

    </div>

  `;

  await renderPDF();
}

async function renderPDF() {
  try {
    const pdf = await ensurePdfLoaded();

    if (state.pdfPage < 1) {
      state.pdfPage = 1;
    }

    if (state.pdfPage > pdf.numPages) {
      state.pdfPage = pdf.numPages;
    }

    const page = await pdf.getPage(state.pdfPage);

    const viewport = page.getViewport({
      scale: state.pdfZoom * 1.25
    });

    const canvas =
      document.getElementById("pdfCanvas");

    const ink =
      document.getElementById("pdfInk");

    if (!canvas || !ink) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    ink.width = viewport.width;
    ink.height = viewport.height;

    canvas.style.width =
      viewport.width + "px";

    canvas.style.height =
      viewport.height + "px";

    ink.style.width =
      viewport.width + "px";

    ink.style.height =
      viewport.height + "px";

    await page
      .render({
        canvasContext: canvas.getContext("2d"),
        viewport
      })
      .promise;

    const info =
      document.getElementById("pdfInfo");

    if (info) {
      info.textContent =
        `Página ${state.pdfPage} de ${pdf.numPages}`;
    }

    restoreInk();

    if (state.inkMode) {
      setupPdfInk();
    }

  } catch (error) {
    console.error(error);

    const info =
      document.getElementById("pdfInfo");

    if (info) {
      info.textContent =
        "Não foi possível carregar a Bíblia PDF.";
    }
  }
}

/* =========================================================
   NAVEGAÇÃO PDF
========================================================= */

window.pdfPrev = function () {
  if (state.pdfPage <= 1) return;

  state.pdfPage--;

  pdfPage();
};

window.pdfNext = async function () {
  const pdf = await ensurePdfLoaded();

  if (state.pdfPage >= pdf.numPages) return;

  state.pdfPage++;

  pdfPage();
};

window.pdfGoto = async function (number) {
  const pdf = await ensurePdfLoaded();

  if (!number) return;

  if (number < 1) number = 1;
  if (number > pdf.numPages) {
    number = pdf.numPages;
  }

  state.pdfPage = number;

  pdfPage();
};

window.pdfZoom = function (amount) {
  state.pdfZoom =
    Math.max(
      0.55,
      Math.min(
        2.4,
        state.pdfZoom + amount
      )
    );

  data.settings.pdfZoom =
    state.pdfZoom;

  save();

  pdfPage();
};

/* =========================================================
   PESQUISA NO PDF
========================================================= */

function normalizeSearch(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

window.searchPDF = async function () {
  if (state.pdfSearchBusy) return;

  const input =
    document.getElementById(
      "pdfSearchInput"
    );

  const status =
    document.getElementById(
      "pdfSearchStatus"
    );

  const results =
    document.getElementById(
      "pdfSearchResults"
    );

  const query =
    input?.value.trim();

  if (!query) {
    toast("Digite algo para pesquisar.");

    return;
  }

  state.pdfSearchBusy = true;
  state.pdfSearchResults = [];

  results.innerHTML = "";

  const pdf =
    await ensurePdfLoaded();

  const target =
    normalizeSearch(query);

  status.textContent =
    `Pesquisando "${query}"...`;

  /*
   * Para evitar travar o navegador,
   * mostramos até 30 resultados.
   */

  const MAX_RESULTS = 30;

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {

    if (
      state.pdfSearchResults.length >=
      MAX_RESULTS
    ) {
      break;
    }

    try {
      const page =
        await pdf.getPage(pageNumber);

      const content =
        await page.getTextContent();

      const text =
        content.items
          .map(item => item.str)
          .join(" ");

      const normalized =
        normalizeSearch(text);

      if (
        normalized.includes(target)
      ) {

        const original =
          text.replace(/\s+/g, " ");

        let position =
          normalized.indexOf(target);

        /*
         * Como normalização altera índices,
         * usamos um pequeno trecho inicial
         * da página.
         */

        let preview =
          original.slice(0, 280);

        if (original.length > 280) {
          preview += "...";
        }

        state.pdfSearchResults.push({
          page: pageNumber,
          preview
        });

        results.insertAdjacentHTML(
          "beforeend",
          `

            <div class="item">

              <strong>
                Página ${pageNumber}
              </strong>

              <div class="muted">
                ${escapeHTML(preview)}
              </div>

              <br>

              <button
                class="btn primary"
                onclick="window.openPDFSearchResult(${pageNumber})"
              >
                Abrir página
              </button>

            </div>

          `
        );
      }

      if (
        pageNumber % 25 === 0
      ) {
        status.textContent =
          `Pesquisando... ${pageNumber}/${pdf.numPages}`;
      }

    } catch (error) {
      console.warn(
        "Erro ao pesquisar página",
        pageNumber,
        error
      );
    }
  }

  state.pdfSearchBusy = false;

  if (
    state.pdfSearchResults.length === 0
  ) {

    status.textContent =
      `Nenhum resultado para "${query}".`;

  } else {

    status.textContent =
      `${state.pdfSearchResults.length} resultado(s) encontrado(s).`;

  }
};

window.openPDFSearchResult =
  function (pageNumber) {

    state.pdfPage = pageNumber;

    pdfPage();

  };

/* =========================================================
   CANETA PDF
========================================================= */

function inkKey() {
  return `pdf-page-${state.pdfPage}`;
}

window.toggleInk =
  function () {

    state.inkMode =
      !state.inkMode;

    pdfPage();

  };

function setupPdfInk() {
  const canvas =
    document.getElementById("pdfInk");

  if (!canvas) return;

  const context =
    canvas.getContext("2d");

  let drawing = false;

  let currentStroke = [];

  function point(event) {

    const rect =
      canvas.getBoundingClientRect();

    const scaleX =
      canvas.width / rect.width;

    const scaleY =
      canvas.height / rect.height;

    return {
      x:
        (event.clientX - rect.left) *
        scaleX,

      y:
        (event.clientY - rect.top) *
        scaleY
    };
  }

  canvas.onpointerdown =
    event => {

      if (!state.inkMode) return;

      drawing = true;

      currentStroke = [];

      const p = point(event);

      currentStroke.push(p);

      context.beginPath();

      context.moveTo(
        p.x,
        p.y
      );

      canvas.setPointerCapture(
        event.pointerId
      );
    };

  canvas.onpointermove =
    event => {

      if (
        !drawing ||
        !state.inkMode
      ) return;

      const p = point(event);

      currentStroke.push(p);

      context.lineTo(
        p.x,
        p.y
      );

      context.strokeStyle =
        "#111111";

      context.lineWidth = 3;

      context.lineCap =
        "round";

      context.lineJoin =
        "round";

      context.stroke();
    };

  canvas.onpointerup =
    () => {

      if (!drawing) return;

      drawing = false;

      if (
        currentStroke.length
      ) {

        if (
          !data.pdfInk[inkKey()]
        ) {
          data.pdfInk[
            inkKey()
          ] = [];
        }

        data.pdfInk[
          inkKey()
        ].push(
          currentStroke
        );

        save();
      }
    };

  canvas.onpointercancel =
    () => {

      drawing = false;

    };
}

function restoreInk() {
  const canvas =
    document.getElementById("pdfInk");

  if (!canvas) return;

  const context =
    canvas.getContext("2d");

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const strokes =
    data.pdfInk[
      inkKey()
    ] || [];

  context.strokeStyle =
    "#111111";

  context.lineWidth = 3;

  context.lineCap =
    "round";

  context.lineJoin =
    "round";

  for (const stroke of strokes) {

    if (!stroke.length) continue;

    context.beginPath();

    context.moveTo(
      stroke[0].x,
      stroke[0].y
    );

    for (
      let i = 1;
      i < stroke.length;
      i++
    ) {

      context.lineTo(
        stroke[i].x,
        stroke[i].y
      );

    }

    context.stroke();
  }
}

window.clearPdfInk =
  function () {

    if (
      !confirm(
        "Apagar as anotações desta página?"
      )
    ) {
      return;
    }

    delete data.pdfInk[
      inkKey()
    ];

    save();

    restoreInk();

    toast(
      "Anotações apagadas."
    );
  };

/* =========================================================
   AGENDA
========================================================= */

function agenda() {
  const month =
    state.calendarMonth;

  const year =
    state.calendarYear;

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const totalDays =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const monthOptions =
    MONTHS.map(
      (name, index) => `
        <option
          value="${index}"
          ${index === month ? "selected" : ""}
        >
          ${name}
        </option>
      `
    ).join("");

  let years = "";

  for (
    let y = CAL_MIN_YEAR;
    y <= CAL_MAX_YEAR;
    y++
  ) {

    years += `
      <option
        value="${y}"
        ${y === year ? "selected" : ""}
      >
        ${y}
      </option>
    `;
  }

  let cells = "";

  for (
    let empty = 0;
    empty < firstDay;
    empty++
  ) {
    cells += `<div></div>`;
  }

  for (
    let day = 1;
    day <= totalDays;
    day++
  ) {

    const iso =
      `${year}-` +
      `${String(month + 1).padStart(2, "0")}-` +
      `${String(day).padStart(2, "0")}`;

    const events =
      data.events.filter(
        event => event.date === iso
      );

    cells += `

      <div class="day">

        <small>
          ${day}
        </small>

        ${events
          .map(
            event => `
              <div
                class="event"
                onclick="window.editEvent(${event.id})"
                style="cursor:pointer"
              >
                ${
                  event.time
                    ? `<strong>${escapeHTML(event.time)}</strong>`
                    : ""
                }

                ${escapeHTML(event.title)}
              </div>
            `
          )
          .join("")}

        <button
          class="btn"
          style="
            padding:4px 8px;
            margin-top:7px;
            font-size:11px
          "
          onclick="window.newEvent('${iso}')"
        >
          +
        </button>

      </div>

    `;
  }

  document.getElementById("main").innerHTML = `

    <div class="hero">

      <div>

        <h1>Agenda</h1>

        <div class="muted">
          Organize seus compromissos e pregações.
        </div>

      </div>

      <button
        class="btn primary"
        onclick="window.newEvent()"
      >
        + Compromisso
      </button>

    </div>

    <div class="card">

      <div class="calendar-header">

        <button
          class="btn"
          onclick="window.previousMonth()"
        >
          ←
        </button>

        <div class="calendar-selects">

          <select
            onchange="window.changeCalendarMonth(+this.value)"
          >
            ${monthOptions}
          </select>

          <select
            onchange="window.changeCalendarYear(+this.value)"
          >
            ${years}
          </select>

        </div>

        <button
          class="btn"
          onclick="window.nextMonth()"
        >
          →
        </button>

      </div>

      <div class="calendar">

        ${[
          "Dom",
          "Seg",
          "Ter",
          "Qua",
          "Qui",
          "Sex",
          "Sáb"
        ]
          .map(
            name => `
              <div
                style="
                  font-weight:800;
                  padding:8px;
                  color:#aaa
                "
              >
                ${name}
              </div>
            `
          )
          .join("")}

        ${cells}

      </div>

    </div>

  `;
}

window.changeCalendarMonth =
  function (month) {

    state.calendarMonth =
      month;

    agenda();
  };

window.changeCalendarYear =
  function (year) {

    state.calendarYear =
      year;

    agenda();
  };

window.previousMonth =
  function () {

    if (
      state.calendarMonth === 0
    ) {

      if (
        state.calendarYear <=
        CAL_MIN_YEAR
      ) return;

      state.calendarMonth = 11;
      state.calendarYear--;

    } else {

      state.calendarMonth--;

    }

    agenda();
  };

window.nextMonth =
  function () {

    if (
      state.calendarMonth === 11
    ) {

      if (
        state.calendarYear >=
        CAL_MAX_YEAR
      ) return;

      state.calendarMonth = 0;
      state.calendarYear++;

    } else {

      state.calendarMonth++;

    }

    agenda();
  };

/* =========================================================
   EVENTOS
========================================================= */

window.newEvent =
  function (presetDate = "") {

    const title =
      prompt(
        "Nome do compromisso:"
      );

    if (!title) return;

    const date =
      presetDate ||
      prompt(
        "Data (AAAA-MM-DD):",
        todayISO()
      );

    if (!date) return;

    const time =
      prompt(
        "Horário:",
        "18:30"
      ) || "";

    const location =
      prompt(
        "Local:",
        ""
      ) || "";

    const type =
      prompt(
        "Tipo:",
        "Pregação"
      ) || "";

    data.events.push({
      id: Date.now(),
      title,
      date,
      time,
      location,
      type
    });

    save();

    toast(
      "Compromisso salvo."
    );

    agenda();
  };

window.editEvent =
  function (id) {

    const event =
      data.events.find(
        item => item.id === id
      );

    if (!event) return;

    const action =
      prompt(
        `Compromisso: ${event.title}\n\n` +
        `Digite:\n` +
        `1 para editar\n` +
        `2 para excluir\n` +
        `0 para cancelar`
      );

    if (action === "2") {

      if (
        confirm(
          "Excluir este compromisso?"
        )
      ) {

        data.events =
          data.events.filter(
            item =>
              item.id !== id
          );

        save();

        agenda();
      }

      return;
    }

    if (action !== "1") return;

    event.title =
      prompt(
        "Título:",
        event.title
      ) || event.title;

    event.date =
      prompt(
        "Data:",
        event.date
      ) || event.date;

    event.time =
      prompt(
        "Horário:",
        event.time
      ) || "";

    event.location =
      prompt(
        "Local:",
        event.location
      ) || "";

    save();

    agenda();
  };

/* =========================================================
   PREGAÇÕES
========================================================= */

function sermons() {
  document.getElementById("main").innerHTML = `

    <div class="hero">

      <div>

        <h1>Pregações</h1>

        <div class="muted">
          Prepare seus esboços e utilize o modo púlpito.
        </div>

      </div>

      <button
        class="btn primary"
        onclick="window.newSermon()"
      >
        + Nova pregação
      </button>

    </div>

    <div class="list">

      ${
        data.sermons.length
          ? data.sermons
              .map(
                sermon => `

                  <div class="item">

                    <strong>
                      ${escapeHTML(sermon.title)}
                    </strong>

                    <div>
                      ${escapeHTML(sermon.theme || "")}
                    </div>

                    <div class="muted">
                      ${escapeHTML(sermon.base || "")}
                      ${
                        sermon.date
                          ? ` • ${formatDateBR(sermon.date)}`
                          : ""
                      }
                    </div>

                    <div
                      class="row"
                      style="margin-top:12px"
                    >

                      <button
                        class="btn"
                        onclick="window.openSermon(${sermon.id})"
                      >
                        Editar
                      </button>

                      <button
                        class="btn primary"
                        onclick="window.pulpit(${sermon.id})"
                      >
                        Modo Púlpito
                      </button>

                    </div>

                  </div>

                `
              )
              .join("")
          : `
            <div class="card muted">
              Nenhuma pregação cadastrada.
            </div>
          `
      }

    </div>

  `;
}

/* =========================================================
   NOVA PREGAÇÃO
========================================================= */

window.newSermon =
  function () {

    const title =
      prompt(
        "Título da pregação:"
      );

    if (!title) return;

    const theme =
      prompt(
        "Tema:",
        ""
      ) || "";

    const base =
      prompt(
        "Texto base:",
        "João 3:16"
      ) || "";

    const sermon = {
      id: Date.now(),
      title,
      theme,
      base,
      date: "",
      time: "",
      location: "",
      outline: "",
      notes: ""
    };

    data.sermons.push(
      sermon
    );

    save();

    openSermon(
      sermon.id
    );
  };

/* =========================================================
   EDITOR PREGAÇÃO
========================================================= */

function openSermon(id) {
  const sermon =
    data.sermons.find(
      item => item.id === id
    );

  if (!sermon) return;

  state.currentSermonId =
    id;

  document.getElementById("main").innerHTML = `

    <div class="hero">

      <div>

        <h1>
          ${escapeHTML(sermon.title)}
        </h1>

        <div class="muted">
          ${escapeHTML(sermon.theme || "Sem tema")}
        </div>

      </div>

      <div class="row">

        <button
          class="btn"
          onclick="window.nav('pregacoes')"
        >
          Voltar
        </button>

        <button
          class="btn primary"
          onclick="window.pulpit(${sermon.id})"
        >
          Modo Púlpito
        </button>

      </div>

    </div>

    <div class="grid">

      <div class="card">

        <h3>Informações</h3>

        <div class="field">

          <label>Título</label>

          <input
            value="${escapeHTML(sermon.title)}"
            onchange="window.updateSermon(${sermon.id}, 'title', this.value)"
          >

        </div>

        <div class="field">

          <label>Tema</label>

          <input
            value="${escapeHTML(sermon.theme || "")}"
            onchange="window.updateSermon(${sermon.id}, 'theme', this.value)"
          >

        </div>

        <div class="field">

          <label>Texto base</label>

          <input
            value="${escapeHTML(sermon.base || "")}"
            onchange="window.updateSermon(${sermon.id}, 'base', this.value)"
          >

        </div>

        <div class="field">

          <label>Data</label>

          <input
            type="date"
            value="${sermon.date || ""}"
            onchange="window.updateSermon(${sermon.id}, 'date', this.value)"
          >

        </div>

        <div class="field">

          <label>Horário</label>

          <input
            type="time"
            value="${sermon.time || ""}"
            onchange="window.updateSermon(${sermon.id}, 'time', this.value)"
          >

        </div>

        <div class="field">

          <label>Local</label>

          <input
            value="${escapeHTML(sermon.location || "")}"
            onchange="window.updateSermon(${sermon.id}, 'location', this.value)"
          >

        </div>

      </div>

      <div class="card">

        <h3>Esboço</h3>

        <textarea
          rows="18"
          placeholder="Escreva aqui seu esboço..."
          onchange="window.updateSermon(${sermon.id}, 'outline', this.value)"
        >${escapeHTML(sermon.outline || "")}</textarea>

      </div>

      <div class="card">

        <h3>Anotações</h3>

        <textarea
          rows="18"
          placeholder="Anotações adicionais..."
          onchange="window.updateSermon(${sermon.id}, 'notes', this.value)"
        >${escapeHTML(sermon.notes || "")}</textarea>

      </div>

      <div class="card">

        <h3>Bíblia</h3>

        <p>
          Abra a Bíblia PDF para consultar o texto.
        </p>

        <button
          class="btn primary"
          onclick="window.nav('pdf')"
        >
          Abrir Bíblia PDF
        </button>

      </div>

    </div>

  `;
}

window.openSermon =
  openSermon;

window.updateSermon =
  function (
    id,
    key,
    value
  ) {

    const sermon =
      data.sermons.find(
        item =>
          item.id === id
      );

    if (!sermon) return;

    sermon[key] =
      value;

    save();

    toast(
      "Salvo."
    );
  };

/* =========================================================
   MODO PÚLPITO
========================================================= */

window.pulpit =
  function (id) {

    const sermon =
      data.sermons.find(
        item => item.id === id
      );

    if (!sermon) return;

    state.currentSermonId =
      id;

    document.getElementById("main").innerHTML = `

      <div
        class="card"
        style="
          max-width:1150px;
          margin:auto;
        "
      >

        <div class="row">

          <button
            class="btn"
            onclick="window.openSermon(${id})"
          >
            ← Sair
          </button>

          <button
            class="btn"
            onclick="window.fontP(-2)"
          >
            A−
          </button>

          <button
            class="btn"
            onclick="window.fontP(2)"
          >
            A+
          </button>

          <button
            class="btn"
            onclick="window.startTimer()"
          >
            ▶ Cronômetro
          </button>

          <span
            id="timer"
            class="stat"
            style="margin-left:auto"
          >
            00:00
          </span>

          <button
            class="btn primary"
            onclick="window.generateSermonPDF(${id})"
          >
            Gerar PDF
          </button>

        </div>

        <div class="divider"></div>

        <div
          id="pulpitText"
          style="
            font-size:${data.settings.fontSize}px;
            line-height:1.7;
          "
        >

          <h1>
            ${escapeHTML(sermon.title)}
          </h1>

          ${
            sermon.theme
              ? `
                <h3 class="muted">
                  ${escapeHTML(sermon.theme)}
                </h3>
              `
              : ""
          }

          ${
            sermon.base
              ? `
                <p>
                  <strong>Texto base:</strong>
                  ${escapeHTML(sermon.base)}
                </p>
              `
              : ""
          }

          <div class="divider"></div>

          <div
            style="white-space:pre-wrap"
          >
            ${escapeHTML(
              sermon.outline ||
              "Esboço vazio."
            )}
          </div>

          ${
            sermon.notes
              ? `
                <div class="divider"></div>

                <h3>Anotações</h3>

                <div
                  style="white-space:pre-wrap"
                >
                  ${escapeHTML(sermon.notes)}
                </div>
              `
              : ""
          }

        </div>

      </div>

    `;
  };

/* =========================================================
   TAMANHO TEXTO PÚLPITO
========================================================= */

window.fontP =
  function (amount) {

    data.settings.fontSize =
      Math.max(
        18,
        Math.min(
          60,
          data.settings.fontSize +
          amount
        )
      );

    save();

    const element =
      document.getElementById(
        "pulpitText"
      );

    if (element) {
      element.style.fontSize =
        `${data.settings.fontSize}px`;
    }
  };

/* =========================================================
   CRONÔMETRO
========================================================= */

let timerSeconds = 0;
let timerInterval = null;
let timerRunning = false;

window.startTimer =
  function () {

    const timer =
      document.getElementById(
        "timer"
      );

    if (timerRunning) {

      clearInterval(
        timerInterval
      );

      timerRunning = false;

      return;
    }

    timerRunning = true;

    timerInterval =
      setInterval(
        () => {

          timerSeconds++;

          const minutes =
            Math.floor(
              timerSeconds / 60
            );

          const seconds =
            timerSeconds % 60;

          if (timer) {
            timer.textContent =
              `${String(minutes).padStart(2, "0")}:` +
              `${String(seconds).padStart(2, "0")}`;
          }

        },
        1000
      );
  };

/* =========================================================
   GERAR PDF DA PREGAÇÃO
========================================================= */

window.generateSermonPDF =
  function (id) {

    const sermon =
      data.sermons.find(
        item =>
          item.id === id
      );

    if (!sermon) return;

    const printWindow =
      window.open(
        "",
        "_blank"
      );

    if (!printWindow) {

      toast(
        "Permita pop-ups para gerar o PDF."
      );

      return;
    }

    printWindow.document.write(`

      <!DOCTYPE html>

      <html lang="pt-BR">

      <head>

        <meta charset="UTF-8">

        <title>
          ${escapeHTML(sermon.title)}
        </title>

        <style>

          @page {
            size: A4;
            margin: 18mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            color:#111;

            line-height:1.6;

            margin:0;
          }

          .logo {
            font-size:32px;
            font-weight:800;
            letter-spacing:3px;
            margin-bottom:35px;
          }

          h1 {
            font-size:30px;
            margin-bottom:6px;
          }

          .theme {
            color:#555;
            font-size:18px;
            margin-bottom:20px;
          }

          .meta {
            border-top:1px solid #aaa;
            border-bottom:1px solid #aaa;
            padding:12px 0;
            margin-bottom:30px;
          }

          .outline {
            white-space:pre-wrap;
            font-size:16px;
          }

          .notes {
            white-space:pre-wrap;
            margin-top:35px;
          }

          .footer {
            margin-top:50px;
            font-size:11px;
            color:#777;
          }

        </style>

      </head>

      <body>

        <div class="logo">
          AGÍA
        </div>

        <h1>
          ${escapeHTML(sermon.title)}
        </h1>

        <div class="theme">
          ${escapeHTML(sermon.theme || "")}
        </div>

        <div class="meta">

          ${
            sermon.base
              ? `<strong>Texto base:</strong> ${escapeHTML(sermon.base)}<br>`
              : ""
          }

          ${
            sermon.date
              ? `<strong>Data:</strong> ${formatDateBR(sermon.date)}<br>`
              : ""
          }

          ${
            sermon.time
              ? `<strong>Horário:</strong> ${escapeHTML(sermon.time)}<br>`
              : ""
          }

          ${
            sermon.location
              ? `<strong>Local:</strong> ${escapeHTML(sermon.location)}`
              : ""
          }

        </div>

        <h2>Esboço</h2>

        <div class="outline">
          ${escapeHTML(sermon.outline || "")}
        </div>

        ${
          sermon.notes
            ? `
              <div class="notes">

                <h2>Anotações</h2>

                ${escapeHTML(sermon.notes)}

              </div>
            `
            : ""
        }

        <div class="footer">
          Gerado pelo Agía
        </div>

        <script>

          window.onload = function(){

            setTimeout(function(){

              window.print();

            },300);

          }

        <\/script>

      </body>

      </html>

    `);

    printWindow.document.close();
  };

/* =========================================================
   FERRAMENTAS
========================================================= */

function tools() {
  document.getElementById("main").innerHTML = `

    <div class="hero">

      <div>

        <h1>Ferramentas</h1>

        <div class="muted">
          Backup e informações do Agía.
        </div>

      </div>

    </div>

    <div class="grid">

      <div class="card">

        <h3>Backup</h3>

        <p>
          Exporte uma cópia de seus compromissos,
          pregações e anotações.
        </p>

        <button
          class="btn primary"
          onclick="window.downloadBackup()"
        >
          Exportar backup
        </button>

      </div>

      <div class="card">

        <h3>Restaurar</h3>

        <p>
          Importe um backup anteriormente salvo.
        </p>

        <button
          class="btn"
          onclick="window.importBackup()"
        >
          Importar backup
        </button>

      </div>

      <div class="card">

        <h3>Dados</h3>

        <p>
          ${data.events.length} compromisso(s)
        </p>

        <p>
          ${data.sermons.length} pregação(ões)
        </p>

      </div>

      <div class="card">

        <h3>Sobre</h3>

        <p>
          Agía
        </p>

        <div class="muted">
          Bíblia • Agenda • Pregações
        </div>

      </div>

    </div>

  `;
}

/* =========================================================
   BACKUP
========================================================= */

window.downloadBackup =
  function () {

    const content =
      JSON.stringify(
        data,
        null,
        2
      );

    const blob =
      new Blob(
        [content],
        {
          type:
            "application/json"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href =
      url;

    link.download =
      `agia-backup-${todayISO()}.json`;

    link.click();

    URL.revokeObjectURL(
      url
    );
  };

window.importBackup =
  function () {

    const input =
      document.createElement(
        "input"
      );

    input.type =
      "file";

    input.accept =
      ".json";

    input.onchange =
      function () {

        if (
          !input.files?.[0]
        ) return;

        const reader =
          new FileReader();

        reader.onload =
          function () {

            try {

              const imported =
                JSON.parse(
                  reader.result
                );

              if (
                !confirm(
                  "Restaurar este backup?"
                )
              ) {
                return;
              }

              data =
                imported;

              save();

              toast(
                "Backup restaurado."
              );

              render();

            } catch {

              alert(
                "Arquivo de backup inválido."
              );

            }

          };

        reader.readAsText(
          input.files[0]
        );
      };

    input.click();
  };

/* =========================================================
   INICIAR
========================================================= */

render();
