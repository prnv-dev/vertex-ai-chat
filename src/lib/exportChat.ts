import { Chat, Message } from "@/types/chat";

function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function messagesToMarkdown(messages: Message[], chatTitle: string): string {
  const lines: string[] = [];
  
  lines.push(`# ${chatTitle}`);
  lines.push("");
  lines.push(`*Exported on ${formatDate(new Date())}*`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const msg of messages) {
    const sender = msg.role === "user" ? "**You**" : "**VertexAI**";
    const time = formatDate(msg.timestamp);
    
    lines.push(`### ${sender}`);
    lines.push(`*${time}*`);
    lines.push("");
    
    if (msg.images && msg.images.length > 0) {
      lines.push(`*[${msg.images.length} image(s) attached]*`);
      lines.push("");
    }
    
    lines.push(msg.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

export function exportAsMarkdown(chat: Chat): void {
  const markdown = messagesToMarkdown(chat.messages, chat.title);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chat.title.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsPDF(chat: Chat): void {
  const markdown = messagesToMarkdown(chat.messages, chat.title);
  
  // Create a styled HTML document for printing
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${chat.title} - VertexAI Export</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1f2937;
      background: #fff;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
      color: #111827;
    }
    h3 {
      font-size: 14px;
      margin: 0 0 4px 0;
      color: #374151;
    }
    hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 24px 0;
    }
    p {
      margin: 0 0 16px 0;
    }
    em {
      color: #6b7280;
      font-size: 12px;
    }
    pre {
      background: #f3f4f6;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 13px;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    .message {
      margin-bottom: 24px;
      padding: 16px;
      border-radius: 8px;
    }
    .user { background: #f0f9ff; }
    .assistant { background: #f9fafb; }
    .sender { font-weight: 600; margin-bottom: 4px; }
    .time { font-size: 11px; color: #9ca3af; margin-bottom: 8px; }
    .content { white-space: pre-wrap; }
    @media print {
      body { padding: 20px; }
      .message { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${chat.title}</h1>
  <p><em>Exported from VertexAI on ${formatDate(new Date())}</em></p>
  <hr>
  ${chat.messages.map(msg => `
    <div class="message ${msg.role}">
      <div class="sender">${msg.role === "user" ? "You" : "VertexAI"}</div>
      <div class="time">${formatDate(msg.timestamp)}</div>
      ${msg.images && msg.images.length > 0 ? `<p><em>[${msg.images.length} image(s) attached]</em></p>` : ""}
      <div class="content">${escapeHtml(msg.content)}</div>
    </div>
  `).join("")}
</body>
</html>
  `;

  // Open print dialog
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
