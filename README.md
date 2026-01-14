# visa-rescheduler

Automatically monitors and reschedules US visa appointments to earlier dates.

## Prerequisites

- Node.js installed
- Google Chrome installed (script uses Selenium WebDriver)
- Install dependencies: `npm install`

## Usage

```bash
node index.js <email> <password> <current-date> <schedule-id> [facility-id] [not-earlier-than]
```

| Argument           | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| `email`            | Your visa appointment account email                            |
| `password`         | Your account password                                          |
| `current-date`     | Your current appointment date (`YYYY-MM-DD`)                   |
| `schedule-id`      | Your appointment schedule ID (found in the URL when logged in) |
| `facility-id`      | (Optional) Consulate facility ID. Default: 25 (Bogota)         |
| `not-earlier-than` | (Optional) Minimum date - won't book before this (`YYYY-MM-DD`)|

### Examples

Basic usage:
```bash
node index.js test@gmail.com 'mypassword123' 2027-01-15 72409682
```

With minimum date (only book appointments from Jan 22nd onwards):
```bash
node index.js test@gmail.com 'mypassword123' 2027-01-15 72409682 25 2026-01-22
```

> **Note:** If your password contains special characters (`*`, `@`, `!`, etc.), wrap it in single quotes.

## How it works

1. Logs into the US visa appointment system
2. Checks for available dates every 60 seconds
3. If a date earlier than your current appointment is found, it reschedules automatically
4. Uses smart slot selection (prefers 2nd/3rd slots to avoid racing with others)
5. Handles both Consulate and ASC (biometrics) appointments
6. Plays sound alerts when earlier dates are found or rescheduled
