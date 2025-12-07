// Array untuk menyimpan semua tasks
let tasks = [];
let taskId = 1;
let isEditMode = false;
let editingId = null;

// DOM Elements
const form = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const feedbackEl = document.getElementById('feedback');

// Filter elements
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');
const filterCategory = document.getElementById('filterCategory');

// Stat elements
const totalTasksEl = document.getElementById('totalTasks');
const activeTasksEl = document.getElementById('activeTasks');
const completedTasksEl = document.getElementById('completedTasks');
const highPriorityTasksEl = document.getElementById('highPriorityTasks');

// Event Listeners
form.addEventListener('submit', handleFormSubmit);
cancelBtn.addEventListener('click', cancelEdit);
filterStatus.addEventListener('change', applyFilters);
filterPriority.addEventListener('change', applyFilters);
filterCategory.addEventListener('change', applyFilters);

// Set min date untuk deadline (hari ini)
const today = new Date().toISOString().split('T')[0];
document.getElementById('taskDeadline').min = today;

// Load data saat halaman dimuat
window.addEventListener('load', loadFromLocalStorage);

/**
 * Handle form submit (tambah atau edit task)
 */
function handleFormSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    const category = document.getElementById('taskCategory').value;
    const description = document.getElementById('taskDescription').value.trim();
    const deadline = document.getElementById('taskDeadline').value;
    const priority = document.querySelector('input[name="priority"]:checked').value;

    // Validasi
    if (!title || !category || !deadline || !priority) {
        showFeedback('Mohon lengkapi semua field yang wajib!', 'error');
        return;
    }

    if (isEditMode && editingId !== null) {
        updateTask(editingId, title, category, description, deadline, priority);
    } else {
        addTask(title, category, description, deadline, priority);
    }
}

/**
 * Tambah task baru
 */
function addTask(title, category, description, deadline, priority) {
    const task = {
        id: taskId++,
        title,
        category,
        description,
        deadline,
        priority,
        completed: false,
        createdAt: getCurrentDateTime()
    };

    tasks.push(task);
    saveToLocalStorage();
    displayTasks();
    updateStats();
    form.reset();
    showFeedback('✅ Task berhasil ditambahkan!', 'success');
}

/**
 * Update task yang sudah ada
 */
function updateTask(id, title, category, description, deadline, priority) {
    const index = tasks.findIndex(t => t.id === id);

    if (index !== -1) {
        tasks[index].title = title;
        tasks[index].category = category;
        tasks[index].description = description;
        tasks[index].deadline = deadline;
        tasks[index].priority = priority;

        saveToLocalStorage();
        displayTasks();
        updateStats();
        form.reset();
        cancelEdit();
        showFeedback('✅ Task berhasil diupdate!', 'success');
    }
}

/**
 * Mode edit task
 */
function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    isEditMode = true;
    editingId = id;

    // Isi form dengan data task
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskCategory').value = task.category;
    document.getElementById('taskDescription').value = task.description;
    document.getElementById('taskDeadline').value = task.deadline;
    document.querySelector(`input[name="priority"][value="${task.priority}"]`).checked = true;

    // Update tampilan form
    formTitle.textContent = '✏️ Edit Task';
    submitBtn.innerHTML = '<span>Update Task</span>';
    cancelBtn.style.display = 'block';

    // Scroll ke form
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Batal edit
 */
function cancelEdit() {
    isEditMode = false;
    editingId = null;
    form.reset();
    formTitle.textContent = '➕ Tambah Task Baru';
    submitBtn.innerHTML = '<span>Tambah Task</span>';
    cancelBtn.style.display = 'none';
}

/**
 * Hapus task
 */
function deleteTask(id) {
    if (!confirm('Yakin ingin menghapus task ini?')) return;

    tasks = tasks.filter(t => t.id !== id);
    saveToLocalStorage();
    displayTasks();
    updateStats();
    showFeedback('🗑️ Task berhasil dihapus!', 'success');
}

/**
 * Toggle complete task
 */
function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveToLocalStorage();
        displayTasks();
        updateStats();
    }
}

/**
 * Display tasks dengan filter
 */
function displayTasks() {
    let filteredTasks = [...tasks];

    // Filter berdasarkan status
    const statusFilter = filterStatus.value;
    if (statusFilter === 'active') {
        filteredTasks = filteredTasks.filter(t => !t.completed);
    } else if (statusFilter === 'completed') {
        filteredTasks = filteredTasks.filter(t => t.completed);
    }

    // Filter berdasarkan prioritas
    const priorityFilter = filterPriority.value;
    if (priorityFilter !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.priority === priorityFilter);
    }

    // Filter berdasarkan kategori
    const categoryFilter = filterCategory.value;
    if (categoryFilter !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.category === categoryFilter);
    }

    // Tampilkan tasks
    taskList.innerHTML = '';

    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>Belum ada task</h3>
                <p>Tambahkan task baru untuk memulai!</p>
            </div>
        `;
        return;
    }

    // Sort: incomplete first, then by priority, then by deadline
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        
        return new Date(a.deadline) - new Date(b.deadline);
    });

    filteredTasks.forEach(task => {
        const taskEl = createTaskElement(task);
        taskList.appendChild(taskEl);
    });
}

/**
 * Buat elemen task
 */
function createTaskElement(task) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;

    const categoryIcons = {
        personal: '🏠',
        work: '💼',
        study: '📚',
        health: '💪',
        others: '📦'
    };

    const categoryNames = {
        personal: 'Personal',
        work: 'Work',
        study: 'Study',
        health: 'Health',
        others: 'Others'
    };

    const priorityLabels = {
        high: '🔥 High',
        medium: '⚡ Medium',
        low: '💚 Low'
    };

    // Check if overdue
    const isOverdue = !task.completed && new Date(task.deadline) < new Date();

    taskItem.innerHTML = `
        <div class="task-header">
            <div class="task-title-wrapper">
                <input type="checkbox" 
                       class="task-checkbox" 
                       ${task.completed ? 'checked' : ''}
                       onchange="toggleComplete(${task.id})">
                <h3 class="task-title">${task.title}</h3>
            </div>
            <div class="task-badges">
                <span class="badge priority-${task.priority}">${priorityLabels[task.priority]}</span>
                <span class="badge category">${categoryIcons[task.category]} ${categoryNames[task.category]}</span>
            </div>
        </div>
        
        ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
        
        <div class="task-footer">
            <div class="task-deadline ${isOverdue ? 'overdue' : ''}">
                <span>📅</span>
                <span>${formatDate(task.deadline)}</span>
                ${isOverdue ? '<span>⚠️ Terlambat!</span>' : ''}
            </div>
            <div class="task-actions">
                <button class="btn-edit" onclick="editTask(${task.id})">✏️ Edit</button>
                <button class="btn-delete" onclick="deleteTask(${task.id})">🗑️ Hapus</button>
            </div>
        </div>
    `;

    return taskItem;
}

/**
 * Apply filters
 */
function applyFilters() {
    displayTasks();
}

/**
 * Update statistics
 */
function updateStats() {
    const total = tasks.length;
    const active = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;
    const highPriority = tasks.filter(t => t.priority === 'high' && !t.completed).length;

    totalTasksEl.textContent = total;
    activeTasksEl.textContent = active;
    completedTasksEl.textContent = completed;
    highPriorityTasksEl.textContent = highPriority;
}

/**
 * Show feedback message
 */
function showFeedback(message, type) {
    feedbackEl.textContent = message;
    feedbackEl.className = `feedback ${type}`;

    setTimeout(() => {
        feedbackEl.className = 'feedback';
    }, 3000);
}

/**
 * Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

/**
 * Get current date time
 */
function getCurrentDateTime() {
    return new Date().toISOString();
}

/**
 * Save to localStorage
 */
function saveToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('taskId', taskId.toString());
}

/**
 * Load from localStorage
 */
function loadFromLocalStorage() {
    const savedTasks = localStorage.getItem('tasks');
    const savedId = localStorage.getItem('taskId');

    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        displayTasks();
        updateStats();
    }

    if (savedId) {
        taskId = parseInt(savedId);
    }
}