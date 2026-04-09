import { bootstrapAdminBrowser } from "./bootstrap.tsx";
import "./ui/styles.css";

if (typeof document !== "undefined") {
  const target = document.getElementById("root");
  if (target) {
    bootstrapAdminBrowser(target);
  }
}
