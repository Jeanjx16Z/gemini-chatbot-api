const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

const conversation = [];

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  input.value = '';
  appendMessage('user', userMessage);
  conversation.push({ role: 'user', text: userMessage });

  const thinkingMessage = appendMessage('bot', 'Thinking...');
  thinkingMessage.classList.add('thinking');

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
    } else {
      updateMessage(thinkingMessage, 'Sorry, no response received.');
    }
  } catch (error) {
    updateMessage(thinkingMessage, 'Failed to get response from server.');
    console.error('Chat request failed:', error);
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
