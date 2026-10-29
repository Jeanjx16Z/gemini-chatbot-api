const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const submitButton = form.querySelector('button[type="submit"]');

const conversation = [];
let isLoading = false;

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (isLoading) return;

  const userMessage = input.value.trim();
  if (!userMessage) return;

  isLoading = true;
  input.disabled = true;
  submitButton.disabled = true;

  input.value = '';
  appendMessage('user', userMessage);

  const pendingUserMessage = { role: 'user', text: userMessage };
  conversation.push(pendingUserMessage);

  const thinkingMessage = appendMessage('bot', 'Thinking...');
  thinkingMessage.classList.add('thinking');
  let hasModelResponse = false;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();
    const result = data && typeof data.result === 'string' ? data.result.trim() : '';

    if (result) {
      updateMessage(thinkingMessage, result);
      conversation.push({ role: 'model', text: result });
      hasModelResponse = true;
    } else {
      updateMessage(thinkingMessage, 'Sorry, no response received.');
    }
  } catch (error) {
    updateMessage(thinkingMessage, 'Failed to get response from server.');
    console.error('Chat request failed:', error);
  } finally {
    if (!hasModelResponse && conversation[conversation.length - 1] === pendingUserMessage) {
      conversation.pop();
    }

    isLoading = false;
    input.disabled = false;
    submitButton.disabled = false;
    input.focus();
  }
});

function appendMessage(role, text) {
  const message = document.createElement('div');
  message.classList.add('message', role);
  message.textContent = text;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
  return message;
}

function updateMessage(element, text) {
  element.textContent = text;
  element.classList.remove('thinking');
  chatBox.scrollTop = chatBox.scrollHeight;
}
