# Bill Tracker PWA

## Overview
The Bill Tracker PWA is a Progressive Web Application designed to help users keep track of their bills due each pay period. It features a user-friendly interface that allows users to manage their bills efficiently.

## Features
- **Unified Dashboard**: View total due, paid, and overdue bills at a glance.
- **Dynamic Views**:
  - **📋 List View**: Detailed table with balance tracking and payment toggles.
  - **📅 Calendar View**: Monthly grid with color-coded bill indicators.
  - **📊 Analytics View**: Spending breakdown by category and 6-month historical trends.
- **Paycheck Synchronization**: Views automatically sync to your selected pay period date range.
- **Cloud Sync**: Securely sync your data across devices using Supabase.
- **Theme Engine**: Robust Dark Mode and Light Mode support.
- **PWA Core**: Installable on mobile/desktop with offline support.

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
*   **Data Safety**:
    *   Persistent local storage.
    *   Automatic local backup.
    *   Cloud synchronization via Supabase.

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

5.  **Enable Google Authentication**:
    *   Go to **Authentication** > **Providers** in Supabase.
    *   Enable **Google**.
    *   You will need to set up OAuth consent screen in Google Cloud Console to get the `Client ID` and `Client Secret`.
    *   Add `https://<YOUR_PROJECT_ID>.supabase.co/auth/v1/callback` to "Authorized redirect URIs" in Google Cloud Console.

## 🔮 Next Steps (Roadmap)

Here is where we left off and what you can tackle next:

1.  **Push Notifications**: Use the Web Push API to send reminders when bills are due.
2.  **Mobile Polish**: Add swipe gestures for "Quick Pay" on mobile devices.
3.  **Bill Splitting**: Add functionality to split bills with other users.

## 📂 Project Structure

*   `src/app.js` - Main controller and app orchestrator.
*   `src/components/` - UI modules (Sidebar, Header, BillGrid, AuthModal).
*   `src/services/` - Supabase integration.
*   `src/utils/` - Helpers for date calculation and storage.
*   `public/service-worker.js` - PWA caching logic.

## 💾 JSON Import Specification

You can bulk import bills by uploading a JSON file. The system will automatically handle unique ID generation, so you don't need to provide them in your source file.

### Basic Payload Format
```json
{
  "bills": [
    {
      "name": "Electric Bill",
      "category": "Utilities",
      "dueDate": "2026-02-01",
      "amountDue": 150.00,
      "recurrence": "Monthly"
    },
    {
      "name": "Rent",
      "category": "Rent",
      "dueDate": "2026-02-01",
      "amountDue": 1200.00,
      "recurrence": "Monthly"
    }
  ]
}
```

### Field Definitions

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`name`** | String | Yes | The display name of the bill. |
| **`category`** | String | Yes | Must match one of your categories (e.g., "Utilities", "Rent"). |
| **`dueDate`** | String | Yes | Format: `YYYY-MM-DD`. |
| **`amountDue`**| Number | Yes | The total amount of the bill. |
| **`recurrence`**| String | Yes | Values: `One-time`, `Weekly`, `Bi-weekly`, `Monthly`, `Yearly`. |
| **`notes`** | String | No | Optional additional details. |
| **`website`** | String | No | Optional URL for payment/login. |
| **`balance`** | Number | No | Defaults to `amountDue` if omitted. |
| **`isPaid`** | Boolean| No | Defaults to `false` if omitted. |
| **`id`** | String | No | **Auto-generated** if omitted. Safe to leave blank. |

## 📊 Importing from Spreadsheets (CSV)

If you have your bills in Excel or Google Sheets, you can easily convert them to the required JSON format using the provided utility script.

### 1. Prepare your Spreadsheet
Create a spreadsheet with the following headers:
`Name, Category, Due Date, Amount, Recurrence, Notes, Website`

### 2. Export as CSV
Save your spreadsheet as `bills.csv` in the project root.

### 3. Run the Conversion Script
```bash
python3 scripts/csv_to_json.py
```
This will create a file named `bills-import.json`.

### 4. Import into App
1. Open the Bill Tracker PWA.
2. Go to **Settings** or **Sidebar** > **Import Data**.
3. Select the `bills-import.json` file.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.