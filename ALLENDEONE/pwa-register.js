(function () {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async function () {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
      console.log("PWA lista");
    } catch (err) {
      console.error("No se pudo registrar el service worker:", err);
    }
  });
})();