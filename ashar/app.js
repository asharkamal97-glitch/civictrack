/* =========================================================
   CITIZEN SERVICE REQUEST MANAGEMENT SYSTEM
   app.js — Core Logic, Data Structures, Storage
   =========================================================
   
   DATA STRUCTURES USED:
   ─────────────────────
   1. HASH TABLE  → complaintHashTable (Object / Map)
      Purpose: O(1) lookup of complaints by ID
      
   2. QUEUE       → complaintQueue (Array used as FIFO)
      Purpose: Process new complaints in order received
      
   3. ARRAY       → complaintList
      Purpose: Ordered storage of all complaints
   ========================================================= */

'use strict';

/* ─────────────────────────────────────────────────────────
   DATA STRUCTURE 1: HASH TABLE
   Stores complaints keyed by ID for O(1) lookup.
   complaintHashTable["CSR-001"] → complaint object
   ───────────────────────────────────────────────────────── */
let complaintHashTable = {};   // Plain object acts as hash map

/* ─────────────────────────────────────────────────────────
   DATA STRUCTURE 2: QUEUE  (FIFO Array)
   New complaints are enqueued when submitted.
   Admin "processes" them by dequeuing from front.
   ───────────────────────────────────────────────────────── */
let complaintQueue = [];  // Array used as queue

/* ─────────────────────────────────────────────────────────
   DATA STRUCTURE 3: ARRAY
   Flat list of all complaints for iteration / display.
   ───────────────────────────────────────────────────────── */
let complaintList = [];

/* ─────────────────────────────────────────────────────────
   QUEUE OPERATIONS (FIFO)
   ───────────────────────────────────────────────────────── */
function enqueue(item) {
  // Push to back of queue
  complaintQueue.push(item);
}

function dequeue() {
  // Remove from front of queue (FIFO)
  if (complaintQueue.length === 0) return null;
  return complaintQueue.shift();
}

function peekQueue() {
  return complaintQueue[0] || null;
}

/* ─────────────────────────────────────────────────────────
   HASH TABLE OPERATIONS
   ───────────────────────────────────────────────────────── */
function htSet(id, complaint) {
  complaintHashTable[id] = complaint;
}

function htGet(id) {
  // O(1) lookup
  return complaintHashTable[id] || null;
}

function htDelete(id) {
  delete complaintHashTable[id];
}

/* ─────────────────────────────────────────────────────────
   LOCALSTORAGE PERSISTENCE
   ───────────────────────────────────────────────────────── */
const LS_KEY        = 'csrms_complaints';
const LS_QUEUE_KEY  = 'csrms_queue';
const LS_COUNTER    = 'csrms_counter';
const LS_THEME      = 'csrms_theme';

function saveToStorage() {
  localStorage.setItem(LS_KEY,       JSON.stringify(complaintList));
  localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(complaintQueue));
}

function loadFromStorage() {
  try {
    const listData  = localStorage.getItem(LS_KEY);
    const queueData = localStorage.getItem(LS_QUEUE_KEY);
    
    // Restore flat array
    complaintList = listData ? JSON.parse(listData) : [];
    
    // Restore queue
    complaintQueue = queueData ? JSON.parse(queueData) : [];
    
    // Rebuild hash table from array (O(n) rebuild on load)
    complaintHashTable = {};
    complaintList.forEach(c => {
      complaintHashTable[c.id] = c;   // Populate hash map
    });
    
  } catch (e) {
    console.error('Storage load error:', e);
    complaintList       = [];
    complaintQueue      = [];
    complaintHashTable  = {};
  }
}

/* ─────────────────────────────────────────────────────────
   ID GENERATOR
   Format: CSR-YYYYMMDD-XXXX  (e.g. CSR-20240115-0042)
   ───────────────────────────────────────────────────────── */
function generateComplaintID() {
  const counter = parseInt(localStorage.getItem(LS_COUNTER) || '0', 10) + 1;
  localStorage.setItem(LS_COUNTER, counter);
  
  const now     = new Date();
  const dateStr = now.getFullYear().toString() +
                  String(now.getMonth() + 1).padStart(2, '0') +
                  String(now.getDate()).padStart(2, '0');
  
  return `CSR-${dateStr}-${String(counter).padStart(4, '0')}`;
}

/* ─────────────────────────────────────────────────────────
   COMPLAINT CRUD
   ───────────────────────────────────────────────────────── */
function addComplaint(data) {
  const id = generateComplaintID();
  const timestamp = new Date().toISOString();
  
  const complaint = {
    id,
    name:        data.name.trim(),
    location:    data.location.trim(),
    issueType:   data.issueType,
    description: data.description.trim(),
    imageBase64: data.imageBase64 || null,
    status:      'Pending',               // Default status
    createdAt:   timestamp,
    updatedAt:   timestamp,
    timeline: [
      { status: 'Submitted',  time: timestamp },
      { status: 'Pending',    time: timestamp }
    ]
  };
  
  // 1. Add to flat array
  complaintList.push(complaint);
  
  // 2. Add to hash table for O(1) lookup
  htSet(id, complaint);
  
  // 3. Enqueue for processing (FIFO)
  enqueue(id);
  
  // 4. Persist
  saveToStorage();
  
  return complaint;
}

function updateComplaintStatus(id, newStatus) {
  // O(1) lookup via hash table
  const complaint = htGet(id);
  if (!complaint) return false;
  
  const timestamp = new Date().toISOString();
  complaint.status    = newStatus;
  complaint.updatedAt = timestamp;
  
  // Append to timeline
  complaint.timeline.push({ status: newStatus, time: timestamp });
  
  // Update hash table
  htSet(id, complaint);
  
  // Update in array (find by ID)
  const idx = complaintList.findIndex(c => c.id === id);
  if (idx !== -1) complaintList[idx] = complaint;
  
  // Remove from queue if resolved/in-progress
  if (newStatus === 'Resolved') {
    complaintQueue = complaintQueue.filter(qId => qId !== id);
  }
  
  saveToStorage();
  return true;
}

function getComplaintById(id) {
  return htGet(id.trim().toUpperCase());  // O(1) hash lookup
}

function getAllComplaints() {
  return [...complaintList].reverse();  // newest first
}

/* ─────────────────────────────────────────────────────────
   STATS / ANALYTICS
   ───────────────────────────────────────────────────────── */
function getStats() {
  const total    = complaintList.length;
  const pending  = complaintList.filter(c => c.status === 'Pending').length;
  const progress = complaintList.filter(c => c.status === 'In Progress').length;
  const resolved = complaintList.filter(c => c.status === 'Resolved').length;
  
  return {
    total,
    pending,
    progress,
    resolved,
    pendingPct:  total ? Math.round((pending  / total) * 100) : 0,
    progressPct: total ? Math.round((progress / total) * 100) : 0,
    resolvedPct: total ? Math.round((resolved / total) * 100) : 0,
    queueLength: complaintQueue.length
  };
}

function getIssueBreakdown() {
  const counts = {};
  complaintList.forEach(c => {
    counts[c.issueType] = (counts[c.issueType] || 0) + 1;
  });
  return counts;
}

/* ─────────────────────────────────────────────────────────
   ADMIN AUTH  (hardcoded — for demo only)
   ───────────────────────────────────────────────────────── */
const ADMIN_CREDS = { username: 'admin', password: 'admin123' };

function adminLogin(username, password) {
  return username === ADMIN_CREDS.username && password === ADMIN_CREDS.password;
}

let isAdminLoggedIn = false;

/* ─────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────── */
function formatDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDateShort(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function statusBadge(status) {
  const map = {
    'Pending':     'badge-pending',
    'In Progress': 'badge-progress',
    'Resolved':    'badge-resolved'
  };
  return `<span class="badge ${map[status] || 'badge-pending'}">${status}</span>`;
}

function issueIcon(type) {
  const icons = {
    Road:        '🛣️',
    Water:       '💧',
    Electricity: '⚡',
    Garbage:     '🗑️',
    Other:       '📋'
  };
  return icons[type] || '📋';
}

/* ─────────────────────────────────────────────────────────
   SEED DATA (for demo / testing)
   ───────────────────────────────────────────────────────── */
function seedSampleData() {
  if (complaintList.length > 0) return;  // Don't re-seed
  
  const samples = [
    {
      name: 'Priya Sharma',
      location: 'Sector 15, Noida',
      issueType: 'Road',
      description: 'Large pothole on main road causing accidents. Multiple vehicles have been damaged.',
      status: 'In Progress'
    },
    {
      name: 'Rajesh Kumar',
      location: 'Malviya Nagar, Delhi',
      issueType: 'Water',
      description: 'No water supply for past 3 days. Residents are facing extreme hardship.',
      status: 'Pending'
    },
    {
      name: 'Anita Verma',
      location: 'MG Road, Pune',
      issueType: 'Electricity',
      description: 'Street lights not working on entire street. Very unsafe at night.',
      status: 'Resolved'
    },
    {
      name: 'Mohammed Aslam',
      location: 'Banjara Hills, Hyderabad',
      issueType: 'Garbage',
      description: 'Garbage not collected for 2 weeks. Strong smell and health hazard.',
      status: 'Pending'
    },
    {
      name: 'Sunita Patel',
      location: 'Vastrapur, Ahmedabad',
      issueType: 'Other',
      description: 'Stray dogs creating nuisance near school. Children scared to walk.',
      status: 'In Progress'
    }
  ];
  
  // Use past dates for seed data
  const baseDate = new Date();
  
  samples.forEach((s, i) => {
    const dateOffset = new Date(baseDate);
    dateOffset.setDate(dateOffset.getDate() - (samples.length - i) * 3);
    
    const id = generateComplaintID();
    const ts = dateOffset.toISOString();
    const updTs = new Date(dateOffset.getTime() + 86400000).toISOString();
    
    const timeline = [
      { status: 'Submitted', time: ts },
      { status: 'Pending',   time: ts }
    ];
    
    if (s.status === 'In Progress') {
      timeline.push({ status: 'In Progress', time: updTs });
    }
    if (s.status === 'Resolved') {
      timeline.push({ status: 'In Progress', time: updTs });
      timeline.push({ status: 'Resolved',    time: new Date(dateOffset.getTime() + 172800000).toISOString() });
    }
    
    const complaint = {
      id,
      name:        s.name,
      location:    s.location,
      issueType:   s.issueType,
      description: s.description,
      imageBase64: null,
      status:      s.status,
      createdAt:   ts,
      updatedAt:   s.status !== 'Pending' ? updTs : ts,
      timeline
    };
    
    complaintList.push(complaint);
    htSet(id, complaint);
    if (s.status === 'Pending') enqueue(id);
  });
  
  saveToStorage();
}

/* ─────────────────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────────────────── */
loadFromStorage();
seedSampleData();
