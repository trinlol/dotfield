/**
 * Adds a "Copy" button to every code block (pre.snippet, pre.code-block, or pre > code).
 */
(function (root) {
  "use strict";

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  function getCodeText(pre) {
    var code = pre.querySelector("code");
    return (code ? code.textContent : pre.textContent) || "";
  }

  function ensureWrap(pre) {
    if (pre.parentElement && pre.parentElement.classList.contains("snippet-wrap")) {
      return pre.parentElement;
    }
    if (pre.parentElement && pre.parentElement.classList.contains("code-block-wrap")) {
      return pre.parentElement;
    }
    var wrap = document.createElement("div");
    wrap.className = pre.classList.contains("code-block")
      ? "code-block-wrap"
      : "snippet-wrap";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    return wrap;
  }

  function enhancePre(pre) {
    if (pre.dataset.copyEnhanced === "1") return;
    pre.dataset.copyEnhanced = "1";

    var wrap = ensureWrap(pre);
    // Avoid duplicate if page already has a dedicated copy control for this block
    if (wrap.querySelector(".copy-code-btn, .snippet-copy")) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-code-btn";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy code");
    btn.addEventListener("click", function () {
      var text = getCodeText(pre);
      copyText(text).then(
        function () {
          btn.textContent = "Copied";
          btn.classList.add("copied");
          setTimeout(function () {
            btn.textContent = "Copy";
            btn.classList.remove("copied");
          }, 1600);
        },
        function () {
          btn.textContent = "Failed";
          setTimeout(function () {
            btn.textContent = "Copy";
          }, 1600);
        }
      );
    });
    wrap.appendChild(btn);
  }

  function enhanceAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll("pre.snippet, pre.code-block, pre > code");
    // pre > code: enhance the parent pre once
    var seen = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var pre = el.tagName === "PRE" ? el : el.parentElement;
      if (!pre || pre.tagName !== "PRE") continue;
      if (seen.indexOf(pre) !== -1) continue;
      seen.push(pre);
      // Skip tiny single-line tokens that aren't real blocks
      var text = getCodeText(pre).trim();
      if (!text || text.length < 8) continue;
      if (text.indexOf("\n") === -1 && text.length < 40 && !pre.classList.contains("snippet") && !pre.classList.contains("code-block")) {
        continue;
      }
      enhancePre(pre);
    }
  }

  function boot() {
    enhanceAll(document);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Re-run when embed snippet text is replaced
  root.DotfieldCopyCode = { enhanceAll: enhanceAll, enhancePre: enhancePre };
})(typeof globalThis !== "undefined" ? globalThis : this);
