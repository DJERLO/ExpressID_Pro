# ExpressID Pro - Client-Side ID Photo Engine & Automated Print Matrix Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Client--Side-green.svg)](#-privacy--security)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black.svg)](https://express-id-pro.vercel.app)

**ExpressID Pro** is a fast, web-based photo layout engine designed to crop, format, and generate print-ready ID photo matrix sheets for standard photo paper (4R, A4, etc.). Built with vanilla JavaScript, HTML5 Canvas, and modern glassmorphism UI, it automates the entire workflow without requiring server-side storage or heavy graphic design software.

---

## 🎯 Purpose & Story

ExpressID Pro was originally built to solve an operational bottleneck at **4J's Grosari**, our family-owned business. Handling customer transactions while manually cropping ID photos in external background removers and manually aligning them in Microsoft Word or Photoshop was slow and prone to paper waste.

What started as an in-house micro-utility has evolved into a fully featured, privacy-first tool used by small print shop operators, freelancers, students, and job seekers to produce print-ready ID photo layouts in under 30 seconds.

---

## ✨ Key Features

* ✂️ **Smart Crop & ID Card Specs:** Locks aspect ratios for standard ID dimensions (1x1, 2x2, Passport, Visa, Wallet size, Rush ID packages) with rotation and flip controls.
* 🤖 **Client-Side AI Background Removal:** Built-in background removal running directly in the browser via `@imgly/background-removal`.
* 🖨️ **Dynamic Print Matrix Layout:** Automatically tiles cropped images onto standard photo paper dimensions (4R, A4, etc.) with custom margin, padding, and spacing controls.
* ✍️ **Custom Overlays & Signatures:** Interactive digital signature pad integration and name banner overlays for formal identity documents.
* 🔍 **Interactive Canvas Stage:** Live scaling stage with smooth zoom controls, wheel scaling, and reset tools.
* 📥 **Multi-Format Export:** Instant export to print-ready **PDF**, high-res **PNG**, or bundled **ZIP archives** for multi-page jobs.

---

## 🔒 Privacy & Security First

Biometric and personal photos should never sit on an unverified server. **ExpressID Pro operates 100% client-side**:

* **Zero Cloud Uploads:** All image cropping, canvas calculations, background processing, and PDF exports are handled inside your web browser.
* **No Database Storage:** No photos, signatures, or personal data ever touch an external backend database or cloud storage bucket.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (Glassmorphism), Vanilla JavaScript ES6+
* **Image Processing Engine:** [Cropper.js](https://github.com/fengyuanchen/cropperjs) & HTML5 Canvas API
* **In-Browser AI Processing:** [@imgly/background-removal](https://www.npmjs.com/package/@imgly/background-removal)
* **Document & Archive Generation:** [jsPDF](https://github.com/parallax/jsPDF) & [JSZip](https://github.com/Stuk/jszip)
* **Hosting:** Vercel

---

## 🚀 Live Demo & LLM Context

* **Live Web App:** [https://express-id-pro.vercel.app](https://express-id-pro.vercel.app)
* **AI / LLM Search File:** [https://express-id-pro.vercel.app/llms.txt](https://express-id-pro.vercel.app/llms.txt)

---

## 💻 Local Setup & Development

### 📦 Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/DJERLO/ExpressID_Pro.git](https://github.com/DJERLO/ExpressID_Pro.git)
    ```

2. Navigate to the project directory:
    ```bash
    cd ExpressID_Pro
    ```


3. Install dependencies:
    ```bash
    npm install
    ```

4. Start the local development server:
    ```bash
    npm run dev
    ```
---

## 📝 License
```
Distributed under the MIT License. See `LICENSE` for more information.

Copyright (c) 2026 Jerlo F. De Leon
```