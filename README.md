# 🏛️ GeM-Portal-26100 | AI-Powered Bid Compliance Verification Platform

[![SIH 2026](https://img.shields.io/badge/SIH-2026-blue.svg)](https://sih.gov.in/)
[![Problem Statement ID](https://img.shields.io/badge/PS--ID-26100-orange.svg)](https://sih.gov.in/)
[![Ministry](https://img.shields.io/badge/Ministry-Petroleum%20%26%20Natural%20Gas-green.svg)]()
[![Organization](https://img.shields.io/badge/Organization-CPCL-red.svg)]()
[![Team](https://img.shields.io/badge/Team-CYBER%20ASSAULTERZ-purple.svg)]()
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

An intelligent, evidence-linked compliance verification and risk assessment platform designed for **Chennai Petroleum Corporation Limited (CPCL)** under the **Government e-Marketplace (GeM)** procurement framework.

---

## 🎯 Core System Philosophy

> **"AI VERIFIES, RULES EVALUATE, EVIDENCE EXPLAINS, HUMANS DECIDE, EVERYTHING IS AUDITABLE"**

The platform automates repetitive document verification and cross-source reconciliation without replacing the Procurement Officer. **Artificial Intelligence handles text extraction, layout processing, and pattern detection, while deterministic Python rules evaluate legal compliance conditions**—eliminating black-box LLM hallucinations [2-4].

---

## 🏗️ End-to-End System Architecture

```text
┌──────────────────────────┐      ┌──────────────────────────┐      ┌──────────────────────────┐
│  1. Bidder Documents     │      │  2. Tender Document      │      │ 3. Document Processing   │
│ PAN, GST, ITR, OEM Auth, │ ───► │ GeM Bid + ATC Clauses    │ ───► │ Ingestion, SHA-256, OCR, │
│ Financials, Declarations │      │ (PDF / Text)             │      │ LayoutLM & spaCy Extr.   │
└──────────────────────────┘      └──────────────────────────┘      └────────────┬─────────────┘
                                                                                 │
┌──────────────────────────┐      ┌──────────────────────────┐                   ▼
│  6. AI Compliance & Risk │      │ 5. Govt Verification     │      ┌──────────────────────────┐
│ Deterministic Rules,     │ ◄─── │ API Setu / DigiLocker    │ ◄─── │ 4. Tender Understanding  │
│ Commercial Price Anomaly │      │ (Consent-Based Adapters) │      │ Llama 3 / Bhashini RAG   │
└────────────┬─────────────┘      └──────────────────────────┘      └──────────────────────────┘
             │
             ▼
┌──────────────────────────┐      ┌──────────────────────────┐      ┌──────────────────────────┐
│ 7. Compliance Report     │      │ 8. Officer Review Screen │      │ 9. Immutable Audit Log   │
│ PASS / FAIL / REVIEW +   │ ───► │ Split-Screen Evidence    │ ───► │ SHA-256 File Hashes,     │
│ Clause & Page Citations  │      │ Viewer & Overrides       │      │ Timestamps & Rule Version│
└──────────────────────────┘      └────────────┬─────────────┘      └──────────────────────────┘
                                               │
                                      (Feedback Loop) ──► Calibrates AI Confidence
```

---

## 💻 Connected Tech Stack & Rationale

| Layer | Technology | Pipeline Wiring (Input \(\rightarrow\) Output) | Strategic Jury Defense (Why Chosen) |
| :--- | :--- | :--- | :--- |
| **Frontend** | **React + Tailwind CSS** | **In:** Compliance Report JSON<br />**Out:** Split-Screen Evidence Viewer | High-performance, responsive UI for side-by-side document and evidence verification [5]. |
| **API Gateway** | **Node.js (Express)** | **In:** User Requests & Uploads<br />**Out:** OAuth2 Auth & Route Dispatch | Lightweight traffic routing, session management, and role-based access control (RBAC) [5, 6]. |
| **AI Backend** | **FastAPI (Python)** | **In:** Document Payloads<br />**Out:** Async OCR, RAG & Rule Execution | Executes heavy asynchronous ML processing without blocking web gateway traffic [5]. |
| **Database & Vector**| **PostgreSQL + `pgvector`**| **In:** Embeddings & Logs<br />**Out:** RAG Context Chunks & Audit Logs | Stores relational audit logs and vector embeddings inside a single database [5]. |
| **On-Premise OCR** | **PaddleOCR / Tesseract** | **In:** Scanned PDF/Image Bids<br />**Out:** Text + Spatial Coordinates | **Data Privacy:** Runs 100% on-premise without exposing sensitive CPCL bid files to cloud OCR APIs [5]. |
| **Tender RAG** | **Llama 3 (Self-Hosted) + Bhashini** | **In:** Tender PDFs & Regional Docs<br />**Out:** Structured JSON Compliance Schema | Self-hosted Llama 3 protects data sovereignty; Bhashini parses regional state documents [7, 8]. |
| **Layout & NER** | **spaCy + LayoutLM** | **In:** OCR Text Blocks<br />**Out:** Extracted Entities (PAN, GSTIN, Dates) | Preserves visual document structure (tables, seals, signatures) for accurate extraction [9]. |
| **Rule Engine** | **Deterministic Python Rules** | **In:** Extracted Facts + Checklist<br />**Out:** PASS / FAIL / REVIEW Status | **Zero Hallucination:** Rules evaluate legal/numeric logic; AI is restricted to extraction [2, 3, 5]. |
| **Integrations** | **API Setu / DigiLocker Adapters** | **In:** Registration Numbers<br />**Out:** Verification Status (`VERIFIED` / `UNVERIFIED`) | **Graceful Fallback:** If government portals are offline, yields `UNVERIFIED` rather than auto-`PASS` [10, 11]. |
| **Security & Infra**| **MeghRaj / Azure Gov Cloud + SHA-256** | **In:** System Actions & Files<br />**Out:** Immutable Audit Trail | Complies with MeitY security guidelines and CVC auditability standards [6, 12]. |

---

## 🔥 Key USPs & Innovation Differentiators

1. **🛡️ Temporal Compliance:** Evaluates document validity on the **exact tender/bid submission date** rather than today's date (e.g., certificate expired on June 10, 2026 for a September 1, 2026 tender \(\rightarrow\) **FAIL**) [13, 14].
2. **📌 Clause-Level & Page-Level Traceability:** Every `PASS`, `FAIL`, or `REVIEW` result links directly to the specific Tender Clause number and Document Page number [13, 15].
3. **🔄 Human-in-the-Loop Feedback Loop:** Procurement Officer overrides feed back into the AI engine to calibrate extraction confidence thresholds over time [16, 17].
4. **📊 Commercial Price Anomaly Detection:** Calculates price deviation against reference benchmarks:
   \[PD = \frac{\text{Bid Price} - \text{Benchmark}}{\text{Benchmark}} \times 100\]
   Assigns explainable risk ratings (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) [18, 19].
5. **🏛️ GeM Procurement Rules Built-in:** Automated checks for MSE/Startup relaxations, Make in India (MII) local content %, EMD exemptions, and OEM authorization validity [20].

---

## ⏱️ Bounded 36-Hour MVP Scope

The MVP is engineered to prove the complete vertical workflow across a controlled dataset [21, 22]:
* **Scope Boundaries:** 1 Tender Document, 4 Bidder Document Types (PAN, GST, ITR, OEM Auth), 5 Core Compliance Rules [21].
* **5 Bidder Personas Demo Dataset:**
  1. **Bidder A (Fully Compliant):** Valid documents, passes all thresholds \(\rightarrow\) `PASS` [23].
  2. **Bidder B (Missing Document):** Missing mandatory Udyam certificate \(\rightarrow\) `FAIL` [23].
  3. **Bidder C (Entity Mismatch):** PAN company name vs OEM Authorization mismatch \(\rightarrow\) `REVIEW` [23, 24].
  4. **Bidder D (Temporal Expiry / Unverified):** Certificate expired prior to tender date / API down \(\rightarrow\) `UNVERIFIED / FAIL` [13, 23].
  5. **Bidder E (Commercial Anomaly):** Quote is +35% above reference benchmark \(\rightarrow\) `HIGH RISK / REVIEW` [19, 23].

---

## 🛠️ Local Development & Setup Guide

### **Prerequisites**
* Node.js v18+ & npm
* Python 3.10+
* PostgreSQL 15+ with `pgvector` extension enabled
* Tesseract OCR / PaddleOCR installed locally

### **1. Clone Repository**
```bash
git clone https://github.com/aswanth-ks/Gem-Portal-26100-.git
cd Gem-Portal-26100-
```

### **2. Database Setup**
```sql
CREATE DATABASE gem_compliance;
\c gem_compliance;
CREATE EXTENSION IF NOT EXISTS vector;
```

### **3. Backend Setup (FastAPI & Node.js)**
```bash
# Setup FastAPI AI Microservice
cd backend-ai
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Setup Node.js API Gateway
cd ../backend-gateway
npm install
npm start
```

### **4. Frontend Setup (React)**
```bash
cd ../frontend
npm install
npm start
```
Access the dashboard at `http://localhost:3000`.

---

## 🔒 Security & CVC Audit Transparency

* **On-Premise Privacy:** On-premise PaddleOCR ensures sensitive CPCL procurement files remain on secure local infrastructure [5, 25].
* **Tamper-Evident Logs:** SHA-256 cryptographic hashes are calculated at ingestion and stored alongside every extraction, rule execution, and officer action [12].
* **Authentication:** Role-Based Access Control (RBAC) via OAuth2 with AES-256 encryption at rest [6].

---

## 👥 Team Identity & Contact

* **Hackathon:** Smart India Hackathon 2026
* **Problem Statement ID:** 26100
* **Team Name:** CYBER ASSAULTERZ
* **Organization:** Chennai Petroleum Corporation Limited (CPCL), Ministry of Petroleum & Natural Gas

---
*Built with ❤️ for SIH 2026.*
