# Bill Splitting Feature Summary

This document outlines the implementation of the Bill Splitting feature, allowing users to divide individual bills among multiple payers.

## 1. Feature Overview
The bill splitting functionality introduces the ability to assign specific financial responsibilities for a single bill to multiple individuals, such as roommates or spouses.

## 2. UI Updates
- **Bill Form Toggle**: A new "Split Bill" toggle was added to the bill entry form (`billForm.js`).
- **Dynamic Payer Fields**: When enabled, the form dynamically exposes input fields to add multiple payers, capturing their names and their respective portion of the bill amount.
- **Visual Indicators**: In the main `billGrid.js`, bills that have splitting enabled are prominently flagged with a "SPLIT (X)" badge in the "Amount Due" column, where X is the number of active payers.

## 3. Logic & Data Flow
- **Data Schema Model**: The `BillStore.js` schema was updated to support a nested `split` object within each bill record `(enabled, payers array)`.
- **Payment Handling**: The `billActionHandlers.js` was modified to process partial payments. When a specific payer's portion is fulfilled, the application recalculates the remaining balance of the overall bill dynamically.
- **Persistence Fixes**: Resolved edge cases where manually building DOM objects ignored the nested split data. Data now correctly hydrates and persists to both Local Storage and Supabase.

## 4. Verification
- Manual verification confirmed that split badges render correctly and remain persistent across application reloads and synced environments.
