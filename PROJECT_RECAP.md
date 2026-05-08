# Project Recap: Billing App

## Overview
The Billing App is a desktop application designed for freelancers and small businesses to manage clients, products, and generate professional invoices and quotes. It is built with a modern tech stack focused on performance, aesthetics, and ease of use.

## Architecture
- **Framework**: [React](https://reactjs.org/) (built with [Vite](https://vitejs.dev/))
- **Desktop Wrapper**: [Electron](https://www.electronjs.org/)
- **Database**: [SQLite](https://sqlite.org/) (via `better-sqlite3` in the Electron main process)
- **Styling**: Vanilla CSS with a custom design system (defined in `index.css`)
- **Icons**: [Lucide React](https://lucide.dev/)

## File Structure & Directory Guide
- `electron/`: Core desktop logic
    - `main.js`: Main process, handles window creation and IPC.
    - `database.js`: Database schema definition and migration logic.
    - `preload.js`: Bridge between the main process and the React frontend.
- `src/`: Frontend application code
    - `App.jsx`: Main entry point and routing logic.
    - `hooks/`: Custom React hooks
        - `useDatabase.js`: Interface for executing SQL queries via IPC.
        - `useSettings.js`: Logic for loading and saving application settings.
    - `pages/`: Application views
        - `Dashboard.jsx`: Overview of business performance.
        - `Clients.jsx`: Client management (detailed profiles, verification).
        - `Products.jsx`: Product/Service management (multilingual support).
        - `DocumentList.jsx`: List of all invoices and quotes.
        - `DocumentEditor.jsx`: Powerful editor for creating/editing documents.
        - `Settings.jsx`: Global configuration and translations.
    - `components/`: Reusable UI components (Button, Input, etc.).
    - `styles/`: Additional style modules.

## Key Features & Logic
### 1. Document Numbering
Document numbers are constructed using a dynamic, segment-based system. Users can define a pattern in Settings using different segment types:
- **Text**: Custom static strings (e.g., `INV_`, `Project_`).
- **Date Time**: Dynamic dates (e.g., `YYYYMMDD`, `YYYY`) based on today's date or creation date.
- **Sequence Number**: Automatically incrementing numbers with configurable padding (e.g., `0001`, `001`).
This allows for highly flexible and professional document naming conventions exactly tailored to the user's needs.

### 2. Multilingual Support
The app supports English (EN), German (DE), and French (FR). 
- **Products**: Can have translated names and descriptions.
- **Documents**: When creating an invoice or quote, you can select the target language. The app will automatically use the translated product data and PDF labels.
- **Translations Tab**: Allows users to customize labels like "Invoice", "Due Date", etc., for all supported languages.

### 3. Automated Due Dates
- **Invoices**: Automatically set to 1 month after the issuing date.
- **Quotes**: Automatically set to 2 months after the issuing date (labeled as "Valid Until").
- Both remain manually adjustable.

### 4. Client Profiles & Verification
Clients have detailed address fields (`address_street`, `address_zip`, `address_city`, `address_country`).
- **Address Verification**: Integrated with OpenStreetMap (Nominatim) for address lookup and auto-fill.
- **Contact Verification**: Built-in validation for emails and phone numbers.

### 5. Document Management
Documents can be saved, edited, and exported as PDFs. The editor supports loading existing products or adding custom items on the fly.

## Versioning Directive
- **x.0.0**: Heavily modifying tools or core architecture.
- **0.x.0**: Major feature additions or architectural shifts.
- **0.0.x**: Aesthetic changes, QoL improvements, or minor bug fixes.

---
*Created by Antigravity AI Assistant.*
