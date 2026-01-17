import csv
import json
import os
import sys
from datetime import datetime

def convert_csv_to_json(csv_file_path, output_json_path):
    """
    Converts a bill tracking CSV to the internal JSON format.
    Expects headers: Name, Category, Due Date, Amount, Recurrence, Notes
    """
    if not os.path.exists(csv_file_path):
        print(f"Error: File '{csv_file_path}' not found.")
        return False

    bills = []
    categories = set()
    
    try:
        with open(csv_file_path, mode='r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            
            # Normalize field names (case-insensitive and strip whitespace)
            headers = {h.strip().lower(): h for h in reader.fieldnames}
            
            def get_val(key, default=""):
                actual_key = headers.get(key.lower())
                return row[actual_key].strip() if actual_key else default

            for i, row in enumerate(reader):
                try:
                    name = get_val('Name')
                    category = get_val('Category', 'Other')
                    due_date = get_val('Due Date')
                    amount = get_val('Amount', '0')
                    recurrence = get_val('Recurrence', 'Monthly')
                    notes = get_val('Notes', '')

                    if not name or not due_date:
                        print(f"Skipping row {i+1}: Name and Due Date are required.")
                        continue

                    if category:
                        categories.add(category)

                    # Basic date validation/formatting
                    formatted_date = due_date
                    if due_date:
                        try:
                            # Attempt to parse common formats
                            if '-' in due_date:
                                parts = due_date.split('-')
                                if len(parts[0]) == 2: # YY-MM-DD
                                    dt = datetime.strptime(due_date, '%y-%m-%d')
                                else:
                                    dt = datetime.strptime(due_date, '%Y-%m-%d')
                            elif '/' in due_date:
                                parts = due_date.split('/')
                                if len(parts[-1]) == 2: # MM/DD/YY
                                    dt = datetime.strptime(due_date, '%m/%d/%y')
                                else:
                                    dt = datetime.strptime(due_date, '%m/%d/%Y')
                            else:
                                dt = datetime.strptime(due_date, '%Y%m%d')
                            formatted_date = dt.strftime('%Y-%m-%d')
                        except ValueError:
                            print(f"Warning row {i+1}: Could not parse date '{due_date}'. Using as is.")
                    else:
                        print(f"Warning row {i+1}: Empty date field. Using empty string.")
                        formatted_date = ""

                    bill = {
                        "name": name,
                        "category": category,
                        "dueDate": formatted_date,
                        "amountDue": float(amount.replace('$', '').replace(',', '')),
                        "recurrence": recurrence,
                        "notes": notes
                    }
                    bills.append(bill)
                except Exception as e:
                    print(f"Error processing row {i+1}: {e}")

        payload = {
            "exportDate": datetime.now().isoformat() + "Z",
            "version": "1.0",
            "bills": bills,
            "customCategories": sorted(list(categories))
        }

        with open(output_json_path, 'w', encoding='utf-8') as jsonfile:
            json.dump(payload, jsonfile, indent=2)

        print(f"Successfully converted {len(bills)} bills to {output_json_path}")
        return True

    except Exception as e:
        print(f"Fatal error: {e}")
        return False

if __name__ == "__main__":
    input_file = "bills.csv"
    output_file = "bills-import.json"
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
        
    convert_csv_to_json(input_file, output_file)
