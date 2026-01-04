# Bill Tracker PWA

## Overview
The Bill Tracker PWA is a Progressive Web Application designed to help users keep track of their bills due each pay period. It features a user-friendly interface that allows users to manage their bills efficiently.

## Features
- A header displaying the title and a list of payroll checks.
- A sidebar with predefined categories for bills.
- A main grid for displaying bills, including:
  - Bill name
  - Due date
  - Recurrence frequency
  - Balance tracking
- A form for adding or editing bills.

## Project Structure
```
bill-tracker-pwa
├── src
│   ├── index.html          # Main HTML document
│   ├── index.css           # Styles for the application
│   ├── index.js            # Entry point for JavaScript functionality
│   ├── components          # Contains reusable components
│   │   ├── header.js       # Header component
│   │   ├── sidebar.js      # Sidebar component
│   │   ├── billGrid.js     # Bill grid component
│   │   └── billForm.js     # Bill form component
│   ├── utils               # Utility functions
│   │   ├── storage.js      # Local storage management
│   │   ├── dateHelpers.js   # Date-related utilities
│   │   └── billHelpers.js   # Bill-related logic
│   ├── data                # Data files
│   │   └── categories.json  # Predefined categories for bills
│   └── serviceWorker.js    # Service worker for offline capabilities
├── public
│   ├── manifest.json       # Web app manifest
│   └── icons               # Icon files for the PWA
├── package.json            # npm configuration file
└── README.md               # Project documentation
A robust, offline-capable Progressive Web App for tracking recurring bills, managing payments, and synchronizing data across devices.

## 🚀 Features

*   **PWA Core**: Installable on mobile/desktop, works offline with Service Worker caching.
*   **Smart Dashboard**: Compact "Stats Bar" for instant visibility of total due, paid, and overdue bills.
*   **Payment Management**:
    *   Track partial payments.
    *   View full payment history for any bill.
    *   Auto-select current pay period.
*   **Cloud Sync (New!)**: Integrated with **Supabase** to sync your data across all your devices.
*   **Theme Engine**: Built-in Dark Mode & Light Mode with persistent preferences.
*   **Data Safety**:
    *   Automatic local backup.
    *   Export/Import data to JSON.
    *   Cloud backup (when logged in).

## 🛠️ Setup & Configuration

### 1. Run Locally (Terminal)
You can start the app using Node.js (Recommended) or Python.

**Option A: Using Node.js (npm)**
```bash
# Install dependencies
npm install

# Start the server
npm start
```
*The app will be available at [http://localhost:8080](http://localhost:8080)*

**Option B: Using Python**
If you don't have Node.js installed, you can use Python's built-in server:
```bash
# Navigate to the project folder
cd bill-tracker-pwa

# Start server
python3 -m http.server 8000
```
*The app will be available at [http://localhost:8000](http://localhost:8000)*

### 2. Configure Cloud Sync (Supabase)
To enable Cloud Sync, you need to provide your own free Supabase credentials.

1.  **Create Project**: Go to [Supabase](https://supabase.com) and sign up for a free project.
2.  **Get Credentials**:
    *   Go to **Project Settings** > **API**.
    *   Copy the `Project URL`.
    *   Copy the `anon` / `public` Key.
3.  **Update Code**:
    *   Open `src/services/supabase.js`.
    *   Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual values.
4.  **Create Database Table**:
    *   Go to **SQL Editor** in Supabase dashboard.
    *   Run the following query to create the table:
    ```sql
    create table user_data (
      user_id uuid references auth.users not null primary key,
      bills jsonb
    );
    
    alter table user_data enable row level security;
    
    create policy "Individuals can create user_data." on user_data for
        insert with check (auth.uid() = user_id);
    
    create policy "Individuals can view their own user_data. " on user_data for
        select using (auth.uid() = user_id);
    
    create policy "Individuals can update their own user_data." on user_data for
        update using (auth.uid() = user_id);
    ```

## 🔮 Next Steps (Roadmap)

Here is where we left off and what you can tackle next:

1.  **Visualize Spending**: Add a charts library (like Chart.js) to visualize spending breakdown by category.
2.  **Push Notifications**: Use the Web Push API to send reminders when bills are due.
3.  **Mobile Polish**: Add swipe gestures for "Quick Pay" on mobile devices.

## 📂 Project Structure

*   `src/index.js` - Main controller and app orchestrator.
*   `src/components/` - UI modules (Sidebar, Header, BillGrid, AuthModal).
*   `src/services/` - Supabase integration.
*   `src/utils/` - Helpers for date calculation and storage.
*   `public/service-worker.js` - PWA caching logic.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.