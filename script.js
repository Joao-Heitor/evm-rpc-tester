document.addEventListener("DOMContentLoaded", () => {
  const savedRpc = localStorage.getItem("lastRpcUrl");
  if (savedRpc) {
    document.getElementById("rpcUrl").value = savedRpc;

    const knownBtn = Array.from(document.querySelectorAll(".btn-secondary")).find((btn) =>
      btn.onclick.toString().includes(savedRpc)
    );
    if (knownBtn) knownBtn.classList.add("active");
  }

  const savedHash = localStorage.getItem("lastTxHash");
  if (savedHash) {
    document.getElementById("txHash").value = savedHash;
  }
});

const copyBtn = (text) => `
    <button class="copy-icon" onclick="copyToClipboard('${text}', this)" title="Copiar">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    </button>
`;

function setRPC(url, btnElement) {
  document.getElementById("rpcUrl").value = url;
  document.querySelectorAll(".btn-secondary").forEach((b) => b.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");
}

async function testConnection() {
  const rpcUrl = document.getElementById("rpcUrl").value.trim();
  const testBtn = document.getElementById("testBtn");

  if (!rpcUrl) return alert("Insira uma URL de RPC");

  localStorage.setItem("lastRpcUrl", rpcUrl);
  testBtn.disabled = true;
  testBtn.innerHTML = "Testando...";

  try {
    const startTime = performance.now();
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: ["latest", false],
        id: 1,
      }),
    });
    const endTime = performance.now();
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    displaySuccess(data.result, Math.round(endTime - startTime));
  } catch (error) {
    displayError(error.message);
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = "Testar Conexão";
  }
}

async function checkReceipt() {
    const rpcUrl = document.getElementById('rpcUrl').value.trim();
    const txHash = document.getElementById('txHash').value.trim();
    const btn = document.getElementById('receiptBtn');
    const resultBox = document.getElementById('receiptContent');
    const container = document.getElementById('receiptResult');

    if (!rpcUrl) return alert('Configure a URL do RPC acima primeiro');
    if (!txHash) return alert('Insira o Hash da transação');

    localStorage.setItem('lastTxHash', txHash);
    localStorage.setItem('lastRpcUrl', rpcUrl);

    btn.disabled = true;
    btn.textContent = 'Buscando...';
    container.classList.remove('show');

    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_getTransactionReceipt",
                params: [txHash],
                id: 1
            })
        });
        const data = await response.json();
        const receipt = data.result;

        if (!receipt) {
            resultBox.innerHTML = '<div style="padding:10px; color:#f85149">Receipt não encontrado.</div>';
        } else {
            let timestampStr = "Carregando...";
            try {
                const blockResp = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "eth_getBlockByNumber",
                        params: [receipt.blockNumber, false], // false = sem txs completas, mais leve
                        id: 2
                    })
                });
                const blockData = await blockResp.json();
                if(blockData.result && blockData.result.timestamp) {
                    timestampStr = new Date(parseInt(blockData.result.timestamp, 16) * 1000).toLocaleString();
                }
            } catch(e) { console.error("Falha ao buscar timestamp", e); }

            // Renderiza
            const status = receipt.status === "0x1" ? "Sucesso" : "Falha";
            const statusColor = receipt.status === "0x1" ? "#3fb950" : "#f85149";
            const gasUsed = parseInt(receipt.gasUsed, 16);
            const blockNum = parseInt(receipt.blockNumber, 16);
            
            // Lógica de Explorers (mantida igual)
            let etherscanBase = "https://etherscan.io";
            let blockscoutBase = "https://eth.blockscout.com";
            if (rpcUrl.includes('sepolia')) { etherscanBase = "https://sepolia.etherscan.io"; blockscoutBase = "https://eth-sepolia.blockscout.com"; }
            else if (rpcUrl.includes('holesky')) { etherscanBase = "https://holesky.etherscan.io"; blockscoutBase = "https://eth-holesky.blockscout.com"; }
            else if (rpcUrl.includes('base')) { etherscanBase = "https://basescan.org"; blockscoutBase = "https://base.blockscout.com"; }
            else if (rpcUrl.includes('polygon') || rpcUrl.includes('matic')) { etherscanBase = "https://polygonscan.com"; blockscoutBase = "https://polygon.blockscout.com"; }

            const etherscanLink = `${etherscanBase}/tx/${txHash}`;
            const blockscoutLink = `${blockscoutBase}/tx/${txHash}`;
            
            resultBox.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                    <div class="status-badge" style="border-color: ${statusColor}; color: ${statusColor}; margin-bottom:0;">
                       ${status === 'Sucesso' ? '●' : '✕'} Transação: ${status}
                    </div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        <a href="${etherscanLink}" target="_blank" class="external-link" title="Ver no Etherscan">Etherscan ↗</a>
                        <span style="color:var(--color-border)">|</span>
                        <a href="${blockscoutLink}" target="_blank" class="external-link" title="Ver no Blockscout">Blockscout ↗</a>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-card">
                        <span class="info-label">Bloco</span>
                        <div class="info-value-row">
                            <span class="info-value" style="color: #58a6ff; font-weight:bold;">${blockNum}</span>
                            ${copyBtn(blockNum)}
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <span class="info-label">Horário (Local)</span>
                        <div class="info-value-row">
                            <span class="info-value">${timestampStr}</span>
                        </div>
                    </div>

                    <div class="info-card">
                        <span class="info-label">Gas Usado</span>
                        <div class="info-value-row">
                            <span class="info-value">${gasUsed.toLocaleString()}</span>
                            ${copyBtn(gasUsed)}
                        </div>
                    </div>
                    <div class="info-card" style="grid-column: 1 / -1">
                        <span class="info-label">Contrato / Para (To)</span>
                        <div class="info-value-row">
                            <span class="info-value">${receipt.to || receipt.contractAddress || 'Criação de Contrato'}</span>
                            ${copyBtn(receipt.to || receipt.contractAddress)}
                        </div>
                    </div>
                </div>

                <details>
                    <summary>
                        <span>JSON Completo</span>
                        <button class="btn-xs" onclick="copyToClipboard('${JSON.stringify(receipt).replace(/'/g, "\\'")}', this)">Copiar JSON</button>
                    </summary>
                    <pre>${JSON.stringify(receipt, null, 2)}</pre>
                </details>
            `;
        }
        container.classList.add('show');
    } catch (err) {
        alert("Erro: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Buscar Receipt';
    }
}


function displaySuccess(block, time) {
  const container = document.getElementById("resultsContainer");
  const badge = document.getElementById("statusBadge");
  const content = document.getElementById("resultsContent");

  badge.className = "status-badge status-success";
  badge.innerHTML = `✓ Conectado (${time}ms)`;

  const blockNum = parseInt(block.number, 16);
  const timestamp = new Date(parseInt(block.timestamp, 16) * 1000).toLocaleTimeString();

  content.innerHTML = `
        <div class="info-grid">
            <div class="info-card">
                <span class="info-label">Bloco Atual</span>
                <div class="info-value-row">
                    <span class="info-value" style="color: #58a6ff; font-weight:bold;">${blockNum}</span>
                    ${copyBtn(blockNum)}
                </div>
            </div>
            <div class="info-card">
                <span class="info-label">Horário (Local)</span>
                <div class="info-value-row">
                    <span class="info-value">${timestamp}</span>
                </div>
            </div>
             <div class="info-card">
                <span class="info-label">Transações</span>
                <div class="info-value-row">
                    <span class="info-value">${block.transactions.length} txs</span>
                </div>
            </div>
            <div class="info-card" style="grid-column: 1 / -1">
                <span class="info-label">Minerador / Fee Recipient</span>
                <div class="info-value-row">
                    <span class="info-value">${block.miner}</span>
                    ${copyBtn(block.miner)}
                </div>
            </div>
        </div>
    `;

  container.classList.add("show");
}

function displayError(msg) {
  const container = document.getElementById("resultsContainer");
  const badge = document.getElementById("statusBadge");
  const content = document.getElementById("resultsContent");

  badge.className = "status-badge status-error";
  badge.textContent = "Falha na Conexão";
  content.innerHTML = `<div style="margin-top:10px; color:#f85149; font-family:monospace">${msg}</div>`;
  container.classList.add("show");
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const originalColor = btn.style.color;
    btn.style.color = "#3fb950"; // Verde

    if (btn.innerText === "Copiar JSON") {
      btn.innerText = "Copiado!";
      setTimeout(() => {
        btn.innerText = "Copiar JSON";
      }, 2000);
      return;
    }

    setTimeout(() => {
      btn.style.color = originalColor;
    }, 1000);
  });
}
