document.addEventListener("DOMContentLoaded", () => {
  const togglePassword = (button) => {
    const inputId = button.getAttribute("aria-controls");
    if (!inputId) {
      return;
    }

    const input = document.getElementById(inputId);
    if (!input) {
      return;
    }

    const isVisible = input.type === "text";
    input.type = isVisible ? "password" : "text";
    const showLabel = button.getAttribute("data-label-show") || "Show password";
    const hideLabel = button.getAttribute("data-label-hide") || "Hide password";
    button.setAttribute("aria-label", isVisible ? showLabel : hideLabel);
    button.setAttribute("aria-pressed", String(!isVisible));

    button.querySelectorAll("[data-password-icon]").forEach((icon) => {
      const isShowIcon = icon.getAttribute("data-password-icon") === "show";
      icon.classList.toggle("hidden", isVisible ? !isShowIcon : isShowIcon);
    });
  };

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => togglePassword(button));
  });
});
