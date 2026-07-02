/**
 * ItaGestão Board - JavaScript Principal
 */

// ===== Sidebar Toggle =====
document.getElementById('sidebar-toggle')?.addEventListener('click', function() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 992) {
        sidebar.classList.toggle('show');
    } else {
        document.body.classList.toggle('sidebar-collapsed');
    }
});

// Fechar sidebar ao clicar fora (mobile)
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    if (window.innerWidth < 992 && sidebar.classList.contains('show')) {
        if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
            sidebar.classList.remove('show');
        }
    }
});

// ===== AJAX Helper =====
const App = {
    baseUrl: document.querySelector('meta[name="base-url"]')?.content || '',
    
    ajax: function(url, options = {}) {
        const defaults = {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        };
        const config = { ...defaults, ...options };
        return fetch(url, config).then(r => r.json());
    },

    post: function(url, data) {
        const formData = data instanceof FormData ? data : this.objectToFormData(data);
        return this.ajax(url, { method: 'POST', body: formData });
    },

    objectToFormData: function(obj) {
        const fd = new FormData();
        Object.keys(obj).forEach(key => fd.append(key, obj[key]));
        return fd;
    },

    alert: function(container, type, message) {
        const el = document.querySelector(container);
        if (el) {
            el.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>`;
        }
    },

    confirm: function(title, message) {
        return new Promise((resolve) => {
            if (confirm(message || title)) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    },

    toast: function(message, type = 'success') {
        const container = document.getElementById('toast-container') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0 show`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    createToastContainer: function() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        return container;
    }
};

// ===== Kanban Drag & Drop =====
function initKanban() {
    document.querySelectorAll('.kanban-cards').forEach(list => {
        new Sortable(list, {
            group: 'kanban',
            animation: 200,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.kanban-card',
            onEnd: function(evt) {
                const cardId = evt.item.dataset.cardId;
                const newListId = evt.to.dataset.listId;
                const newPosition = evt.newIndex;
                
                // Salvar nova posição via AJAX
                App.post('api.php?module=cartoes&action=mover', {
                    cartao_id: cardId,
                    lista_id: newListId,
                    posicao: newPosition
                }).then(data => {
                    if (data.success) {
                        updateListCounts();
                    } else {
                        App.toast(data.message || 'Erro ao mover cartão', 'danger');
                    }
                });
            }
        });
    });
}

// Atualizar contadores das listas
function updateListCounts() {
    document.querySelectorAll('.kanban-list').forEach(list => {
        const count = list.querySelectorAll('.kanban-card').length;
        const counter = list.querySelector('.kanban-list-count');
        if (counter) counter.textContent = count;
    });
}

// ===== Inicialização =====
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar Kanban se existir
    if (document.querySelector('.kanban-board')) {
        initKanban();
    }

    // Tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(el => new bootstrap.Tooltip(el));

    // Auto-hide alerts
    document.querySelectorAll('.alert:not(.alert-permanent)').forEach(alert => {
        setTimeout(() => {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            if (bsAlert) bsAlert.close();
        }, 5000);
    });
});

// ===== Modal de Cartão =====
function openCardModal(cardId) {
    App.ajax(`api.php?module=cartoes&action=detalhes&id=${cardId}`)
        .then(data => {
            if (data.success) {
                renderCardModal(data.cartao);
            }
        });
}

function renderCardModal(cartao) {
    const modal = document.getElementById('cardModal');
    if (!modal) return;
    
    modal.querySelector('.modal-title').textContent = cartao.titulo;
    modal.querySelector('#card-description').innerHTML = cartao.descricao || '<em class="text-muted">Sem descrição</em>';
    
    // Preencher dados do modal
    if (modal.querySelector('#card-responsavel')) {
        modal.querySelector('#card-responsavel').textContent = cartao.responsavel_nome || 'Não atribuído';
    }
    if (modal.querySelector('#card-prazo')) {
        modal.querySelector('#card-prazo').textContent = cartao.prazo || '-';
    }
    if (modal.querySelector('#card-prioridade')) {
        modal.querySelector('#card-prioridade').textContent = cartao.prioridade_nome || '-';
    }

    // Carregar comentários
    loadComments(cartao.id);
    // Carregar checklist
    loadChecklist(cartao.id);
    // Carregar anexos
    loadAttachments(cartao.id);
    // Carregar histórico
    loadHistory(cartao.id);

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// ===== Comentários =====
function loadComments(cardId) {
    App.ajax(`api.php?module=comentarios&action=listar&cartao_id=${cardId}`)
        .then(data => {
            if (data.success) {
                const container = document.getElementById('comments-list');
                if (!container) return;
                container.innerHTML = data.comentarios.map(c => `
                    <div class="d-flex gap-2 mb-3">
                        <div class="user-avatar" style="width:32px;height:32px;font-size:0.7rem;">${c.iniciais}</div>
                        <div class="flex-grow-1">
                            <div class="fw-semibold small">${c.usuario_nome} <span class="text-muted fw-normal">${c.tempo_relativo}</span></div>
                            <div class="small">${c.comentario}</div>
                        </div>
                    </div>
                `).join('') || '<p class="text-muted small">Nenhum comentário.</p>';
            }
        });
}

function addComment(cardId) {
    const input = document.getElementById('comment-input');
    if (!input || !input.value.trim()) return;
    
    App.post('api.php?module=comentarios&action=criar', {
        cartao_id: cardId,
        comentario: input.value
    }).then(data => {
        if (data.success) {
            input.value = '';
            loadComments(cardId);
            App.toast('Comentário adicionado');
        }
    });
}

// ===== Checklist =====
function loadChecklist(cardId) {
    App.ajax(`api.php?module=checklists&action=listar&cartao_id=${cardId}`)
        .then(data => {
            if (data.success) {
                const container = document.getElementById('checklist-list');
                if (!container) return;
                const total = data.itens.length;
                const done = data.itens.filter(i => i.concluido).length;
                const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                
                let html = `<div class="progress mb-2" style="height:6px;">
                    <div class="progress-bar bg-success" style="width:${progress}%"></div>
                </div>`;
                html += data.itens.map(item => `
                    <div class="checklist-item ${item.concluido ? 'done' : ''}">
                        <input type="checkbox" class="form-check-input" 
                            ${item.concluido ? 'checked' : ''} 
                            onchange="toggleChecklistItem(${item.id}, this.checked)">
                        <span class="checklist-text small">${item.titulo}</span>
                    </div>
                `).join('');
                container.innerHTML = html || '<p class="text-muted small">Nenhum item.</p>';
            }
        });
}

function toggleChecklistItem(itemId, checked) {
    App.post('api.php?module=checklists&action=toggle', {
        id: itemId,
        concluido: checked ? 1 : 0
    });
}

function addChecklistItem(cardId) {
    const input = document.getElementById('checklist-input');
    if (!input || !input.value.trim()) return;
    
    App.post('api.php?module=checklists&action=criar', {
        cartao_id: cardId,
        titulo: input.value
    }).then(data => {
        if (data.success) {
            input.value = '';
            loadChecklist(cardId);
        }
    });
}

// ===== Anexos =====
function loadAttachments(cardId) {
    App.ajax(`api.php?module=anexos&action=listar&cartao_id=${cardId}`)
        .then(data => {
            if (data.success) {
                const container = document.getElementById('attachments-list');
                if (!container) return;
                container.innerHTML = data.anexos.map(a => `
                    <div class="d-flex align-items-center gap-2 mb-2 p-2 bg-light rounded">
                        <i class="bi bi-paperclip"></i>
                        <a href="${a.caminho}" target="_blank" class="small flex-grow-1">${a.nome_original}</a>
                        <small class="text-muted">${a.tamanho_formatado}</small>
                    </div>
                `).join('') || '<p class="text-muted small">Nenhum anexo.</p>';
            }
        });
}

// ===== Histórico =====
function loadHistory(cardId) {
    App.ajax(`api.php?module=cartoes&action=historico&id=${cardId}`)
        .then(data => {
            if (data.success) {
                const container = document.getElementById('history-list');
                if (!container) return;
                container.innerHTML = data.historico.map(h => `
                    <div class="timeline-item">
                        <div class="small fw-semibold">${h.descricao}</div>
                        <div class="timeline-time">${h.usuario_nome} - ${h.tempo_relativo}</div>
                    </div>
                `).join('') || '<p class="text-muted small">Nenhuma movimentação.</p>';
            }
        });
}

// ===== Filtros =====
function applyFilters() {
    const form = document.getElementById('filter-form');
    if (!form) return;
    const params = new URLSearchParams(new FormData(form));
    window.location.href = '?' + params.toString();
}

function clearFilters() {
    const page = new URLSearchParams(window.location.search).get('page') || 'dashboard';
    window.location.href = `?page=${page}`;
}
