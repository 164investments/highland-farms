"use client";

import { useEffect } from "react";

/*
 * The BookedIQ (LeadConnector) chat launcher lives in the <chat-widget>
 * shadow root, out of reach of page CSS. Custom properties do cross that
 * boundary, so one rule adopted into the shadow root reads --hf-chat-lift
 * and --hf-chat-visibility from <html> (globals.css). It changes position
 * and visibility only; the widget loads and behaves exactly as before.
 *
 * - --hf-chat-lift: set while the bottom sticky bar shows (StickyShell), so
 *   the launcher sits above the bar instead of on it.
 * - --hf-chat-visibility: hidden while any modal dialog is open (the menu,
 *   the booking sheet, the popup) and on cart and checkout.
 */
const CHAT_RULE =
  ".lc_text-widget--bubble:not(.active){translate:0 calc(-1 * var(--hf-chat-lift, 0px));transition:translate .3s ease;visibility:var(--hf-chat-visibility, visible)}";

const styledRoots = new WeakSet<ShadowRoot>();
let chatWatch: MutationObserver | null = null;

function styleChatWidgets() {
  document.querySelectorAll("chat-widget").forEach((el) => {
    const root = el.shadowRoot;
    if (!root || styledRoots.has(root)) return;
    styledRoots.add(root);
    try {
      if ("replaceSync" in CSSStyleSheet.prototype && "adoptedStyleSheets" in root) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(CHAT_RULE);
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      } else {
        const style = document.createElement("style");
        style.textContent = CHAT_RULE;
        root.appendChild(style);
      }
    } catch {
      styledRoots.delete(root);
    }
  });
}

/** Teach the chat launcher to follow --hf-chat-lift / --hf-chat-visibility. Idempotent. */
export function ensureChatLauncherStyles() {
  if (typeof window === "undefined" || chatWatch) return;
  styleChatWidgets();
  chatWatch = new MutationObserver(styleChatWidgets);
  chatWatch.observe(document.body, { childList: true });
  if ("customElements" in window) {
    void customElements.whenDefined("chat-widget").then(() => {
      styleChatWidgets();
      window.setTimeout(styleChatWidgets, 1500);
    });
  }
}

/**
 * Mounted once beside the widget script: styles the launcher and keeps
 * <html data-dialog-open> true while any aria-modal dialog is in the page.
 */
export function ChatLauncherBridge() {
  useEffect(() => {
    ensureChatLauncherStyles();
    const html = document.documentElement;
    let frame = 0;
    const check = () => {
      frame = 0;
      if (document.querySelector('[aria-modal="true"]')) html.setAttribute("data-dialog-open", "");
      else html.removeAttribute("data-dialog-open");
    };
    const watch = new MutationObserver(() => {
      if (!frame) frame = window.requestAnimationFrame(check);
    });
    watch.observe(document.body, { childList: true, subtree: true });
    check();
    return () => {
      watch.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      html.removeAttribute("data-dialog-open");
    };
  }, []);
  return null;
}
