import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

export const toastSuccess = (message) =>
  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    close: true,
    style: {
      background: "#22c55e",
    },
  }).showToast();

export const toastError = (message) =>
  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    close: true,
    style: {
      background: "#ef4444",
    },
  }).showToast();