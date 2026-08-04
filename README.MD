# 📸 ExpressID Pro

> **Print-Ready ID Photo & Layout Engine**

ExpressID Pro is a lightweight, web-based photo layout engine designed to quickly crop, format, and prepare ID photos and print matrices for standard photo papers. Built with modern UI glassmorphism and real-time preview canvas scaling.

## 🎯 Purpose & Motivation

**ExpressID Pro** was created to solve a real-world operational bottleneck at **4J's Grosari**, our family-owned sari-sari store. 

In our day-to-day operations, serving customers who come in to buy daily necessities while simultaneously handling rush ID photo requests was a major challenge. Our old workflow was painfully tedious and multi-stepped:
1. Uploading customer photos to third-party tools like **remove.bg** to erase backgrounds
2. Importing the photos into **Microsoft Word** or **Canva**.
3. Manually tweaking image dimensions, margins, and grid alignments for printing.

This manual process was time-consuming and frequently resulted in spacing errors or awkward paper waste during printing.

To streamline our business, 

**ExpressID Pro** was built as a single, unified web engine. It combines background removal, smart cropping ratios (1x1, 2x2, Passport, Visa, and custom combo packages), digital signatures, and automated paper-grid printing layouts into a seamless, single-page workflow —allowing us to produce error-free rush ID prints in seconds while keeping store operations running smoothly.

## ✨ Features

* ✂️ **Smart Crop & ID Cards:** Independent front/back ID cropping, aspect ratio locking, rotation, and horizontal flips.
* 📦 **Preset Packages & Sizes:** Includes pre-configured rush packages (Package A–E) and standard photo dimensions (1x1, 2x2, Passport, Visa, Wallet, A4, etc.).
* 🖨️ **Dynamic Page Grid Layout:** Multi-page canvas rendering with automatic pagination and customizable margin/spacing controls.
* 🔍 **Stage Zoom Controls:** Scalable live-preview stage with zoom controls, wheel zoom, and fit-to-screen reset.
* ✍️ **Custom Overlays:** Live full-name banner text overlay and interactive digital signature pad.
* 🤖 **AI Background Removal:** Integrated single-click background removal (requires internet connection).
* 📥 **Export Options:** High-resolution export options for **PNG (ZIP for multi-page)**, **PDF**, and direct browser **Print**.

---

## 🚀 Live Demo

Check out the live application hosted on GitHub Pages:  


---

## 🛠️ Built With

* **HTML5 Canvas / CSS3** (Vanilla JS architecture & Glassmorphic UI)
* [Cropper.js](https://github.com/fengyuanchen/cropperjs) – Image cropping engine
* [jsPDF](https://github.com/parallax/jsPDF) – Client-side PDF generation
* [JSZip](https://github.com/Stuk/jszip) – Multi-page PNG archive compression
* [@imgly/background-removal](https://www.npmjs.com/package/@imgly/background-removal) – AI background removal engine

---

## 💻 Local Setup & Development

ExpressID Pro is a web application, so you'll need a web browser to view and interact with the app.

### 📦 Installation

1. Clone the repository: `git clone https://github.com/DJERLO/ExpressID_Pro.git`
2. Navigate to the project directory: `cd ExpressID-Pro`
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`
---
## 📝 License

MIT License

---
