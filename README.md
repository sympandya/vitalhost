<h1 align="center">
  <br>
  VitalHost
  <br>
</h1>

<h4 align="center">A high-performance, real-time SRE observability and telemetry pipeline.</h4>

<p align="center">
  <a href="https://vitalhost.vercel.app"><b>Live Demo: vitalhost.vercel.app</b></a>
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#load-testing">Load Testing</a>
</p>

---

## 🚀 Overview

**VitalHost** is a real-time observability platform designed to ingest, monitor, and replay server health telemetry with zero UI latency. Engineered for high-throughput streaming, it handles 20+ dynamic system metrics using a robust Node.js backend and a highly optimized React frontend.

Whether monitoring a live production server or simulating high-frequency telemetry via its Dual-Mode Engine, VitalHost ensures smooth, uninterrupted insights into system health, bolstered by an integrated AI DevOps Assistant for rapid root-cause analysis.

---

## ✨ Key Features

* **Dual-Mode Engine:** Seamlessly toggle between live production telemetry (using native Node OS/V8 modules) and a high-frequency Simulation Sandbox utilizing a mathematical "Random Walk" algorithm.
* **1Hz Telemetry Streaming:** Strict 1000ms interval WebSocket broadcasts for real-time visualization.
* **Time-Series "DVR":** Navigate the past 24 hours of server state with a UI scrubber, fetching historical data instantly via a B-Tree indexed PostgreSQL database.
* **Chaos Control Panel:** Inject simulated CPU spikes or memory leaks to stress-test dashboard reaction speeds and incident response workflows.
* **AI DevOps Assistant:** Automated anomaly detection triggers an isolated background worker to securely query the Gemini LLM API, streaming back root-cause analysis without blocking the main telemetry loop.

---

## 🏗️ Architecture Deep Dive

### 1. The Telemetry Data Pipeline (Backend)
Built for high-throughput streaming and efficient data retention, avoiding external message queue costs through calculated SLA trade-offs.

* **Memory Buffering:** Telemetry is buffered in memory and bulk-inserted into PostgreSQL every 5 seconds to optimize database load. Uncaught exception listeners ensure a maximum 5-second data loss trade-off during ungraceful crashes.
* **Hybrid Schema & B-Tree Indexing:** Utilizes PostgreSQL `JSONB` for flexible 20+ metric payloads. Timestamps are extracted into standard relational columns with B-Tree indexing to guarantee lightning-fast "Time-Travel" historical queries.
* **Automated Data Retention (TTL):** A background janitor process executes a rolling 24-hour TTL deletion query, capping the DB footprint strictly under 20MB.

### 2. The Rendering Engine (Frontend)
A dark-mode "Mega-Dashboard" built to prioritize zero-latency rendering over DOM-heavy aesthetics.

* **Canvas-Based Rendering:** Bypasses standard SVG charting for **Chart.js (HTML5 Canvas)**, eliminating DOM-node bloat and keeping the browser's main thread unblocked during continuous 1Hz streams.
* **State Decoupling:** Employs **Zustand selector hooks** to isolate the "Live" WebSocket stream from the "Replay" historical state. When CPU data arrives, *only* the CPU canvas re-renders, preventing cascading React render cycles.
* **Resilient Connectivity:** Graceful WebSocket fallback UI catches dropped connections, displaying a clear "Server Down" state rather than crashing the client.

### 3. Tracked Metrics (20+ Data Points)
* **Hardware:** CPU Load Averages (1m, 5m, 15m), Total/Free RAM.
* **V8 Engine:** Heap Total, Heap Used, Resident Set Size (RSS), Event Loop Lag.
* **Network:** Requests Per Second (RPS), Active WebSockets, P99 Latency, 4xx/5xx Error Rates.

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | React, Zustand, Tailwind CSS, Chart.js (Canvas API) |
| **Backend** | Node.js, Express.js, TypeScript, WebSockets |
| **Database** | PostgreSQL (JSONB, B-Tree Indexing) |
| **AI Integration**| Gemini LLM API |
| **Deployment** | Vercel (Frontend) |

---

## 🏁 Getting Started

### Prerequisites
* Node.js (v18+)
* PostgreSQL (Running locally or via cloud provider)
* Gemini API Key

### Local Installation

1. **Clone the repository**
```bash
   git clone https://github.com/sympandya/vitalhost.git
   cd vitalhost