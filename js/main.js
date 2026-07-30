// EN16 — Estrada da Paz — main.js
// Constrói a interface a partir de EN16_DATA (js/data.js).

(function () {
  "use strict";

  const STAGE_COLORS = ["#7A2E2E", "#2B4F3E", "#B8862B", "#3B5F82", "#5A4A7A"];

  document.addEventListener("DOMContentLoaded", () => {
    renderStages();
    renderHighlights();
    initMap();
    initNav();
  });

  // ---------- NAV ----------
  function initNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // ---------- ETAPAS ----------
  function renderStages() {
    const container = document.getElementById("stages-list");
    if (!container || !window.EN16_DATA) return;

    window.EN16_DATA.etapas.forEach((etapa, i) => {
      const card = document.createElement("article");
      card.className = "stage-card";
      card.style.setProperty("--stage-color", STAGE_COLORS[i % STAGE_COLORS.length]);

      const poisHtml = etapa.pontosInteresse
        .map(
          (p) => `
        <li class="${p.destaque ? "destaque" : ""}">
          <span class="poi-name">${p.nome}</span>
          <span class="poi-coord">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</span>
        </li>`
        )
        .join("");

      const especialidades = etapa.restaurante.especialidades && etapa.restaurante.especialidades.length
        ? `<p class="specialties">${etapa.restaurante.especialidades.join(" · ")}</p>`
        : "";

      card.innerHTML = `
        <button class="stage-head" aria-expanded="false">
          <span class="stage-num">${etapa.numero}</span>
          <span class="stage-title-block">
            <span class="stage-title">${etapa.nome}</span>
            <span class="stage-meta">KM ${etapa.kmInicio}–${etapa.kmFim} &nbsp;·&nbsp; ${etapa.distancia} km</span>
          </span>
          <span class="stage-chevron">⌄</span>
        </button>
        <div class="stage-body">
          <div class="stage-body-inner">
            <div>
              <p class="stage-desc">${etapa.descricao}</p>
              <ul class="poi-list">${poisHtml}</ul>
            </div>
            <div class="stage-extras">
              <div class="extra-card">
                <h4>Restaurante típico</h4>
                <p>${etapa.restaurante.nome}${etapa.restaurante.local ? " — " + etapa.restaurante.local : ""}</p>
                ${especialidades}
              </div>
              <div class="extra-card">
                <h4>Dormida</h4>
                <p>${etapa.dormida.nome}</p>
                ${etapa.dormida.nota ? `<p class="specialties">${etapa.dormida.nota}</p>` : ""}
              </div>
            </div>
          </div>
        </div>
      `;

      const head = card.querySelector(".stage-head");
      head.addEventListener("click", () => {
        const isOpen = card.classList.toggle("open");
        head.setAttribute("aria-expanded", String(isOpen));
      });

      container.appendChild(card);
    });

    // abre a primeira etapa por defeito
    const first = container.querySelector(".stage-card");
    if (first) {
      first.classList.add("open");
      first.querySelector(".stage-head").setAttribute("aria-expanded", "true");
    }
  }

  // ---------- 15 LOCAIS ----------
  function renderHighlights() {
    const grid = document.getElementById("highlights-grid");
    if (!grid || !window.EN16_DATA) return;

    window.EN16_DATA.locaisImperdiveis.forEach((nome, i) => {
      const li = document.createElement("li");
      li.className = "highlight-card";
      li.innerHTML = `
        <span class="highlight-index">${String(i + 1).padStart(2, "0")}</span>
        <span class="highlight-name">${nome}</span>
      `;
      grid.appendChild(li);
    });
  }

  // ---------- MAPA ----------
  function initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl || !window.L || !window.EN16_DATA) return;

    const map = L.map("map", { scrollWheelZoom: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18,
    }).addTo(map);

    const bounds = [];
    const legend = document.getElementById("map-legend");

    window.EN16_DATA.etapas.forEach((etapa, i) => {
      const color = STAGE_COLORS[i % STAGE_COLORS.length];

      const routePoints = etapa.pontosInteresse.map((p) => [p.lat, p.lng]);
      if (routePoints.length > 1) {
        L.polyline(routePoints, { color, weight: 3, opacity: 0.55, dashArray: "1 8" }).addTo(map);
      }

      etapa.pontosInteresse.forEach((p) => {
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: p.destaque ? 7 : 5,
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: p.destaque ? 0.9 : 0.55,
        }).addTo(map);
        marker.bindPopup(
          `<div class="poi-popup-title">Etapa ${etapa.numero}</div><strong>${p.nome}</strong>${p.nota ? `<br><em>${p.nota}</em>` : ""}`
        );
        bounds.push([p.lat, p.lng]);
      });

      // restaurante e dormida
      [
        { pt: etapa.restaurante, tipo: "Restaurante" },
        { pt: etapa.dormida, tipo: "Dormida" },
      ].forEach(({ pt, tipo }) => {
        if (pt.lat == null) return;
        const marker = L.marker([pt.lat, pt.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:12px;height:12px;border-radius:2px;background:${color};border:2px solid #F1EAD9;transform:rotate(45deg);"></div>`,
            iconSize: [12, 12],
          }),
        }).addTo(map);
        marker.bindPopup(`<div class="poi-popup-title">${tipo} · Etapa ${etapa.numero}</div><strong>${pt.nome}</strong>`);
        bounds.push([pt.lat, pt.lng]);
      });

      if (legend) {
        const span = document.createElement("span");
        span.innerHTML = `<span class="legend-dot" style="background:${color}"></span> Etapa ${etapa.numero} — ${etapa.nome}`;
        legend.appendChild(span);
      }
    });

    if (bounds.length) map.fitBounds(bounds, { padding: [24, 24] });

    // reativa o zoom por scroll só quando o utilizador clica no mapa
    map.on("click", () => map.scrollWheelZoom.enable());
  }
})();
