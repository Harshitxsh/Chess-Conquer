# ♛ ChessConquer - Advanced Web-Based Chess Analyzer

**ChessConquer** is a modern, interactive chess application that brings the power of the **Stockfish** chess engine directly to your browser. Built with a focus on UI/UX, it features a premium "Wood & Glass" aesthetic, seamless game creation controls, and real-time position analysis.

---

## ✨ Key Features

### 🎮 Gameplay

* **Human vs Computer**: Play against the powerful Stockfish 11 engine running locally in your browser.
* **Smart Interactions**: Replaces traditional drag-and-drop with a mobile-friendly **Click-to-Move** system. Click a piece to select, and tap a highlighted square to move.
* **Flexible Game Setup**:
  * **Choose Your Side**: Play as White or Black.
  * **Custom Start Turn**: Option to let the Computer make the first move, or play Black but move first (Custom Scenarios).
* **Move History**: Scrollable list of every move played in standard algebraic notation.

### 🧠 Analysis & Tools

* **Real-Time Evaluation**: A dynamic evaluation bar shows who is winning (CP Score / Mate Score).
* **PGN Support**: Paste PGN (Portable Game Notation) text to instantly load and analyze historic games.
* **Stockfish Engine**: Integrated via WebAssembly (WASM) for high-performance analysis without a backend server.

### 🎨 Design

* **Glassmorphism UI**: modern, translucent panels with blur effects.
* **Wood Theme**: A warm, classic aesthetic featuring a wooden board and gold accents.
* **Responsive**: Fully responsive layout that adapts to desktops and smaller screens.

---

## 🚀 Live Demo

[Play ChessConquer Live](https://chess-conquer.onrender.com)

---

## 🛠️ Installation & Setup

If you want to run this project locally:

1. **Clone the Repository**

    ```bash
    git clone https://github.com/YOUR_USERNAME/chess-conquer.git
    cd chess-conquer
    ```

2. **Install Dependencies**

    ```bash
    npm install
    ```

3. **Run the Server**

    ```bash
    npm start
    ```

4. **Play**
    Opne your browser and visit `http://localhost:3000`

---

## 📂 Project Structure

* `public/` - Contains all frontend assets.
  * `index.html` - Main game structure.
  * `style.css` - Custom styling (Wood theme, glass effects, highlighting).
  * `script.js` - Game logic, Board interactions, Stockfish communication.
  * `lib/` - External libraries (Stockfish.js).
* `server.js` - Lightweight Node.js Express server.

---

## 👨‍💻 Credits

* **Developer**: [Harshit Sharma] | [LinkedIn Profile](https://www.linkedin.com/in/harshit-sharma-b700b2353/)
* **Libraries**:
  * *Chess.js* (Logic)
  * *Chessboard.js* (Visualization)
  * *Stockfish.js* (Engine)

&copy; 2025 All rights reserved.

