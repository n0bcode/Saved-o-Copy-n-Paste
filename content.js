/*
Scripts that (must) run within its isolated world,
which is the execution environment unique to this extension.
*/

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", afterDOMLoaded);
else afterDOMLoaded();

// Global variables
var lastURL = location.href;
var recentFiles = []; // Array to store recent files
var maxRecentFiles = 5; // Maximum number of recent files to display
var settings = {
  enablePreviews: true,
  layout: "vertical",
};

// Load settings from storage
function loadSettings() {
  if (chrome && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(
      {
        enablePreviews: true,
        layout: "vertical",
      },
      (items) => {
        settings.enablePreviews = items.enablePreviews;
        settings.layout = items.layout;
        logging("Settings loaded from storage: Previews=" + settings.enablePreviews + ", Layout=" + settings.layout);
      }
    );
  } else {
    logging("chrome.storage.sync not available, using default settings.");
    settings.enablePreviews = true;
    settings.layout = "vertical";
  }
}

// Load recent files from localStorage
function loadRecentFiles() {
  try {
    const savedFiles = localStorage.getItem("recentFiles");
    if (savedFiles) {
      recentFiles = JSON.parse(savedFiles);
      // Sort by timestamp descending
      recentFiles.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
  } catch (error) {
    logging("Error loading recent files from localStorage: " + error);
  }
}

// Save file to recent files list
function saveToRecentFiles(file) {
  // Check if file already exists in recent files
  const index = recentFiles.findIndex((f) => f.name === file.name && f.size === file.size);
  if (index !== -1) {
    // Update timestamp if file exists
    recentFiles[index].timestamp = new Date().toISOString();
  } else {
    // Add new file to the beginning of the list
    recentFiles.unshift({
      name: file.name || "Unnamed File",
      size: file.size,
      type: file.type,
      timestamp: new Date().toISOString(),
    });
    // Limit to maxRecentFiles
    if (recentFiles.length > maxRecentFiles) {
      recentFiles.pop();
    }
  }
  // Save to localStorage
  try {
    localStorage.setItem("recentFiles", JSON.stringify(recentFiles));
  } catch (error) {
    logging("Error saving recent files to localStorage: " + error);
  }
}

// Update recent files list in the overlay
function updateRecentFilesList() {
  const recentFilesList = document.querySelector("#cnp-recent-files-list");
  if (!recentFilesList) return;

  // Apply layout based on settings
  if (settings.layout === "horizontal") {
    recentFilesList.style.display = "flex";
    recentFilesList.style.flexDirection = "row";
    recentFilesList.style.flexWrap = "wrap";
    recentFilesList.style.overflowX = "auto";
    recentFilesList.style.overflowY = "hidden";
    recentFilesList.style.maxHeight = "150px";
  } else {
    recentFilesList.style.display = "block";
    recentFilesList.style.overflowY = "auto";
    recentFilesList.style.overflowX = "hidden";
    recentFilesList.style.maxHeight = "150px";
  }

  // Clear current list
  recentFilesList.innerHTML = "";

  if (recentFiles.length === 0) {
    const noFilesMsg = document.createElement("span");
    noFilesMsg.id = "cnp-no-recent-files";
    noFilesMsg.style.fontStyle = "italic";
    noFilesMsg.style.color = "gray";
    noFilesMsg.textContent = "No recent files available";
    recentFilesList.appendChild(noFilesMsg);
  } else {
    recentFiles.forEach((file, index) => {
      const fileItem = document.createElement("div");
      fileItem.style.cursor = "pointer";
      fileItem.style.padding = "3px";
      fileItem.style.borderRadius = "4px";
      if (settings.layout === "horizontal") {
        fileItem.style.marginRight = index < recentFiles.length - 1 ? "5px" : "0";
        fileItem.style.marginTop = "0";
        fileItem.style.flex = "0 0 auto";
      } else {
        fileItem.style.marginTop = index > 0 ? "3px" : "0";
      }
      fileItem.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
      fileItem.textContent = file.name.length > 25 ? file.name.substring(0, 22) + "..." : file.name;
      fileItem.title = file.name;

      // Add preview if enabled and file is an image
      if (settings.enablePreviews && file.type && file.type.startsWith("image/")) {
        const previewIcon = document.createElement("span");
        previewIcon.textContent = "🖼️"; // Placeholder for preview icon
        previewIcon.style.marginRight = "5px";
        fileItem.insertBefore(previewIcon, fileItem.firstChild);
        // Note: Actual image preview would require storing image data or a temporary URL, which is limited in Chrome extensions.
        // This is a placeholder for future implementation with IndexedDB or similar for small thumbnails.
      }

      // Placeholder for click event - actual file upload would require storing file data
      fileItem.onclick = () => {
        logging("Selected recent file: " + file.name);
        // Currently, we can't store actual file data in localStorage, so this is a placeholder
        alert(
          'Unable to upload recent file "' +
            file.name +
            '" directly due to Chrome extension storage limits. Please re-select the file from your device using the "Upload File" button above, or paste it if it\'s still in your clipboard.'
        );
      };
      recentFilesList.appendChild(fileItem);
    });
  }
}

// Inject init.js to the DOM
if (!document.head.querySelector("CnP-init")) {
  const initJS = document.createElement("script");
  initJS.id = `CnP-init`;
  if (document.head.querySelector("CnP-init")) {
    initJS.src = document.head.querySelector("CnP-init").getAttribute("src");
    initJS.setAttribute("overlayhtml", document.head.querySelector("CnP-init").getAttribute("overlayhtml"));
  } else
    try {
      initJS.src = chrome.runtime.getURL("init.js");
      initJS.setAttribute("overlayhtml", chrome.runtime.getURL("overlay.html"));
    } catch {
      if (document.head.querySelector('script:is([id*="CnP-mutatedIframe"], [id*="CnP-iframe"])'))
        window.top.postMessage(
          {
            Type: "getURL",
            iframe: document.head
              .querySelector('script:is([id*="CnP-mutatedIframe"], [id*="CnP-iframe"])')
              .getAttribute("id"),
            Path: `init.js`,
          },
          "*"
        );
      else window.top.postMessage({ Type: "getURL", Path: `init.js` }, "*");

      window.onmessage = (event) => {
        if (event.data.Type == "getURL-response")
          if (isFirefox) initJS.src = event.data.URL;
          else
            initJS.src = trustedTypes
              .createPolicy("forceInner", { createScriptURL: (to_escape) => to_escape })
              .createScriptURL(event.data.URL);
      };
    }
  document.head.appendChild(initJS);
}

function afterDOMLoaded() {
  // Load recent files and settings from storage
  loadRecentFiles();
  loadSettings();

  // Listen for settings updates from popup
  if (chrome && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "updateSettings") {
        settings.enablePreviews = request.enablePreviews;
        settings.layout = request.layout;
        // Apply layout change if overlay is open
        if (document.querySelector("#cnp-recent-files-list")) {
          updateRecentFilesList();
        }
        logging("Settings updated from popup: Previews=" + settings.enablePreviews + ", Layout=" + settings.layout);
      }
    });
  } else {
    logging("chrome.runtime not available, settings updates will not be received.");
  }

  // Prep all input file elements
  if (!document.cnpClickListener)
    document.addEventListener(
      "click",
      (event) => {
        document.cnpClickListener = true;
        if (event.target.matches("input[type='file']")) setupcreateOverlay(event.target);
      },
      true
    );

  // Run through DOM to detect:
  document.querySelectorAll("*").forEach((element, index) => {
    // Raw input file elements
    if (element.matches("input[type='file']")) setupcreateOverlay(element);
    // Shadow roots
    else if (element.shadowRoot)
      element.shadowRoot.querySelectorAll("input[type='file']").forEach((fileInput) => setupcreateOverlay(fileInput));
    // iframes
    else if (element.matches("iframe"))
      if (element.contentDocument) {
        const initJS = element.contentDocument.createElement("script");
        initJS.id = `CnP-init-iframe-${index}`;
        initJS.src = chrome.runtime.getURL("init.js");
        element.contentDocument.head.appendChild(initJS);

        const contentJS = element.contentDocument.createElement("script");
        element.classList.add(`CnP-iframe-${index}`);
        contentJS.id = `CnP-iframe-${index}`;
        contentJS.src = chrome.runtime.getURL("content.js");
        contentJS.setAttribute("overlayhtml", chrome.runtime.getURL("overlay.html"));
        element.contentDocument.head.appendChild(contentJS);
      }
  });

  // Find and prep customized input file elements, iframes
  if (!document.body.cnpMutationObserver) {
    const observer = new MutationObserver((mutations) => {
      // 'Reload' extension when navigated to other pages within the website
      if (lastURL !== location.href) {
        lastURL = location.href;
        afterDOMLoaded();
      }

      // Watch the DOM to detect:
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node, index) => {
          // Input file elements
          if (node.nodeType === Node.ELEMENT_NODE && node.matches("input[type='file']")) setupcreateOverlay(node);
          // Shadow roots
          else if (node.nodeType === Node.ELEMENT_NODE && node.shadowRoot) {
            const fileInputs = node.shadowRoot.querySelectorAll("input[type='file']");
            fileInputs.forEach((fileInput) => setupcreateOverlay(fileInput));
          }

          // iframes
          else if (node.nodeType === Node.ELEMENT_NODE && node.matches("iframe"))
            if (node.contentDocument) {
              // Append init.js, content.js, overlay.html
              const initJS = node.contentDocument.createElement("script");
              const contentJS = node.contentDocument.createElement("script");
              node.classList.add(`CnP-mutatedIframe-${index}`);
              contentJS.id = `CnP-mutatedIframe-${index}`;

              if (document.head.querySelector('script[id*="CnP-init-iframe"]'))
                initJS.src = document.head.querySelector('script[id*="CnP-init-iframe"]').getAttribute("src");
              else initJS.src = chrome.runtime.getURL("init.js");

              if (document.head.querySelector("script[overlayhtml]") !== null) {
                contentJS.src = document.head.querySelector("script[overlayhtml]").getAttribute("src");
                contentJS.setAttribute(
                  "overlayhtml",
                  document.head.querySelector("script[overlayhtml]").getAttribute("overlayhtml")
                );
              } else {
                contentJS.src = chrome.runtime.getURL("content.js");
                contentJS.setAttribute("overlayhtml", chrome.runtime.getURL("overlay.html"));
              }

              try {
                node.contentDocument.head.appendChild(initJS);
                node.contentDocument.head.appendChild(contentJS);
              } catch (error) {
                logging(error);
              }
            }

            // Checks if sub-nodes/child are input file elements
            else if (node.nodeType === Node.ELEMENT_NODE && node.hasChildNodes())
              node.querySelectorAll("input[type='file']").forEach((fileInput) => setupcreateOverlay(fileInput));
            // If the added node is a document fragment, it may contain shadow hosts
            else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
              node.childNodes.forEach((childNode) => {
                if (childNode.nodeType === Node.ELEMENT_NODE && childNode.shadowRoot)
                  childNode.shadowRoot
                    .querySelectorAll("input[type='file']")
                    .forEach((fileInput) => setupcreateOverlay(fileInput));
              });
            }
        });
      });
    });
    try {
      observer.observe(document.body, { childList: true, subtree: true });
      document.body.cnpMutationObserver = true;
    } catch (error) {
      logging(error);
    }
  }

  // Message listener between window.top and iframes
  if (!window.cnpMessageListener)
    window.addEventListener("message", (event) => {
      window.cnpMessageListener = true;
      // Execute paste events from top level since iframes can't
      if (event.data.Type == "paste") {
        if (!event.data.iframe) document.execCommand("paste");
        else
          try {
            document.getElementsByClassName(event.data.iframe)[0].contentDocument.execCommand("paste");
          } catch (error) {
            logging(error);
            try {
              noImage();
            } catch (error) {
              logging(error);
            }
          }
      } else if (event.data.Type == "getURL")
        if (event.data.iframe)
          document
            .getElementsByClassName(event.data.iframe)[0]
            .contentWindow.postMessage({ Type: "getURL-response", URL: chrome.runtime.getURL(event.data.Path) }, "*");
        else window.top.postMessage({ Type: "getURL-response", URL: chrome.runtime.getURL(event.data.Path) }, "*");
    });
}
