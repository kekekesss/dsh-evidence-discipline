const messages = document.querySelector('#messages');
const form = document.querySelector('#form');
const input = document.querySelector('#input');
const trace = document.querySelector('#trace');
const confirmBox = document.querySelector('#confirm');
const confirmButton = document.querySelector('#confirmButton');
const health = document.querySelector('#health');
let conversationId = crypto.randomUUID();
let pending = null;

function add(role, text) {
  const node = document.createElement('div');
  node.className = `bubble ${role}`;
  node.textContent = text.replaceAll('**', '');
  messages.append(node);
  messages.scrollTop = messages.scrollHeight;
}

async function send(message) {
  if (!message.trim()) return;
  add('user', message);
  input.value = '';
  const response = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ conversationId, message }) });
  const data = await response.json();
  add('assistant', data.answer);
  trace.textContent = `trace ${data.traceId} · ${data.steps.length} steps${data.citations?.length ? ` · sources ${data.citations.join(', ')}` : ''}`;
  pending = data.pendingConfirmation ?? null;
  confirmBox.classList.toggle('hidden', !pending);
}

form.addEventListener('submit', (event) => { event.preventDefault(); send(input.value); });
document.querySelectorAll('[data-message]').forEach((button) => button.addEventListener('click', () => send(button.dataset.message)));
confirmButton.addEventListener('click', async () => {
  if (!pending) return;
  const response = await fetch('/api/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ conversationId, payload: pending.payload }) });
  const data = await response.json();
  add('assistant', data.answer);
  trace.textContent = `trace ${data.traceId} · confirmed action`;
  pending = null;
  confirmBox.classList.add('hidden');
});
fetch('/api/health').then((response) => response.ok ? health.textContent = '服务正常' : health.textContent = '服务异常').catch(() => health.textContent = '服务离线');

