/**
 * CAP Chatbot — launcher de widget (burbuja flotante).
 *
 * Uso en cualquier web:
 *   <script src="https://TU-DOMINIO/widget.js" defer></script>
 *
 * Opcional, configurar antes de cargar el script:
 *   <script>window.CAP_WIDGET = { url: "https://TU-DOMINIO/", color: "#1E4DD8" };</script>
 *
 * Inyecta una burbuja en la esquina inferior derecha que abre/cierra un iframe
 * con el chat. No requiere dependencias.
 */
(function () {
  "use strict";

  if (window.__capWidgetLoaded) return;
  window.__capWidgetLoaded = true;

  var cfg = window.CAP_WIDGET || {};
  // Dominio del chatbot: por defecto el mismo origen donde vive widget.js.
  var CHAT_URL =
    cfg.url ||
    (document.currentScript && document.currentScript.src
      ? new URL(".", document.currentScript.src).href
      : "/");
  var COLOR = cfg.color || "#1E4DD8";
  var Z = 2147483000;

  var open = false;

  // --- Iframe del chat -------------------------------------------------------
  var frame = document.createElement("iframe");
  frame.src = CHAT_URL;
  frame.title = "Asistente CAP";
  frame.setAttribute("allow", "clipboard-write");
  frame.style.cssText = [
    "position:fixed",
    "bottom:90px",
    "right:20px",
    // Cuarto de pantalla (mitad ancho x mitad alto), anclado abajo-derecha.
    // En móvil/pantalla pequeña se adapta sin desbordar (clamp por viewport).
    "width:min(50vw, calc(100vw - 24px))",
    "height:min(50vh, calc(100vh - 110px))",
    "min-width:min(340px, calc(100vw - 24px))",
    "min-height:min(460px, calc(100vh - 110px))",
    "max-width:480px",
    "max-height:720px",
    "border:none",
    "border-radius:16px",
    "box-shadow:0 12px 40px rgba(0,0,0,.18)",
    "background:#fff",
    "z-index:" + Z,
    "opacity:0",
    "transform:translateY(16px) scale(.98)",
    "pointer-events:none",
    "transition:opacity .2s ease, transform .2s ease",
  ].join(";");
  frame.setAttribute("aria-hidden", "true");

  // --- Botón burbuja ---------------------------------------------------------
  var btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Abrir chat");
  btn.style.cssText = [
    "position:fixed",
    "bottom:20px",
    "right:20px",
    "width:60px",
    "height:60px",
    "border:none",
    "border-radius:50%",
    "background:" + COLOR,
    "color:#fff",
    "cursor:pointer",
    "box-shadow:0 6px 20px rgba(0,0,0,.22)",
    "z-index:" + (Z + 1),
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "transition:transform .15s ease",
  ].join(";");
  btn.onmouseenter = function () {
    btn.style.transform = "scale(1.06)";
  };
  btn.onmouseleave = function () {
    btn.style.transform = "scale(1)";
  };

  var ICON_CHAT =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var ICON_CLOSE =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  btn.innerHTML = ICON_CHAT;

  function setOpen(v) {
    open = v;
    if (open) {
      frame.style.opacity = "1";
      frame.style.transform = "translateY(0) scale(1)";
      frame.style.pointerEvents = "auto";
      frame.setAttribute("aria-hidden", "false");
      btn.innerHTML = ICON_CLOSE;
      btn.setAttribute("aria-label", "Cerrar chat");
    } else {
      frame.style.opacity = "0";
      frame.style.transform = "translateY(16px) scale(.98)";
      frame.style.pointerEvents = "none";
      frame.setAttribute("aria-hidden", "true");
      btn.innerHTML = ICON_CHAT;
      btn.setAttribute("aria-label", "Abrir chat");
    }
  }

  btn.addEventListener("click", function () {
    setOpen(!open);
  });

  function mount() {
    document.body.appendChild(frame);
    document.body.appendChild(btn);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
