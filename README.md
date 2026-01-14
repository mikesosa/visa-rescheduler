# visa-rescheduler

Automatically monitors and reschedules US visa appointments to earlier dates.

## Prerequisites

- Node.js installed
- Google Chrome installed (script uses Selenium WebDriver)
- Install dependencies: `npm install`

## Usage

```bash
node index.js <email> <password> <current-date> <schedule-id>
```

| Argument       | Description                                                    |
| -------------- | -------------------------------------------------------------- |
| `email`        | Your visa appointment account email                            |
| `password`     | Your account password                                          |
| `current-date` | Your current appointment date (`YYYY-MM-DD`)                   |
| `schedule-id`  | Your appointment schedule ID (found in the URL when logged in) |

### Example

```bash
node index.js test@gmail.com 'mypassword123' 2027-01-15 72409682
```

> **Note:** If your password contains special characters (`*`, `@`, `!`, etc.), wrap it in single quotes.

## How it works

1. Logs into the US visa appointment system
2. Checks for available dates every 60 seconds
3. If a date earlier than your current appointment is found, it reschedules automatically
4. Sends push notifications on status updates
