// content.js

// Function to inject the popup
function showPopup(query) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'ai-energy-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlay.style.zIndex = '10000';

  // Create popup container
  const popup = document.createElement('div');
  popup.id = 'ai-energy-popup';
  popup.style.position = 'fixed';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.backgroundColor = '#ffffff';
  popup.style.padding = '20px';
  popup.style.borderRadius = '8px';
  popup.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  popup.style.zIndex = '10001';

  // Popup content
  popup.innerHTML = `
    <h2>Choose an Option</h2>
    <p>Prompt Score (1-6):</p>
    <ul>
      <li>Google: <strong>2</strong></li>
      <li>ChatGPT: <strong>5</strong></li>
    </ul>
    <button id="ai-google-button">Use Google</button>
    <button id="ai-chatgpt-button">Use ChatGPT</button>
  `;

  // Append popup to overlay
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Handle button clicks
  document.getElementById('ai-google-button').addEventListener('click', () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    removePopup();
  });

  document.getElementById('ai-chatgpt-button').addEventListener('click', () => {
    sendQuery(query);
    removePopup();
  });
}

// Function to remove the popup
function removePopup() {
  const overlay = document.getElementById('ai-energy-overlay');
  if (overlay) {
    document.body.removeChild(overlay);
  }
}

// Function to send the query to ChatGPT
function sendQuery(query) {
  // Select the contenteditable div with id 'prompt-textarea'
  const inputField = document.getElementById('prompt-textarea');

  if (inputField) {
    // Set the input value
    inputField.innerHTML = `<p>${query}</p>`;

    // Dispatch input event to update any React bindings
    inputField.dispatchEvent(new Event('input', { bubbles: true }));

    // Find the send button (adjust the selector as needed)
    const sendButton = document.querySelector('button[class*="bottom"]');

    if (sendButton) {
      // Click the send button
      sendButton.click();
    } else {
      // Alternatively, simulate pressing Enter key
      const enterEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
        code: 'Enter',
      });
      inputField.dispatchEvent(enterEvent);
    }
  }
}

// Function to intercept input events
function interceptInput() {
  const inputField = document.getElementById('prompt-textarea');

  if (inputField) {
    // Intercept Enter key presses in the contenteditable div
    inputField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const query = inputField.innerText.trim();
        showPopup(query);
      }
    });

    // Intercept clicks on the send button
    const sendButton = document.querySelector('button[class*="bottom"]');
    if (sendButton) {
      sendButton.addEventListener('click', (event) => {
        event.preventDefault();
        const query = inputField.innerText.trim();
        showPopup(query);
      });
    }
  }
}

// Observe the DOM for the contenteditable div
const observer = new MutationObserver(() => {
  const inputField = document.getElementById('prompt-textarea');

  if (inputField) {
    observer.disconnect();
    interceptInput();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
