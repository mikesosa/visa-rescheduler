# Visa Rescheduler Script

Automated US visa appointment rescheduler that monitors and reschedules to earlier dates.

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

## Integration

This script is designed to be run:
- **Standalone**: From command line for manual monitoring
- **Via SaaS Platform**: Spawned as child process by the web app's job manager

When called by the SaaS platform (`../src/lib/job-manager.ts`), the script:
- Receives encrypted credentials
- Outputs status to stdout (parsed by parent)
- Updates are captured and stored in database
- Process can be terminated gracefully via SIGTERM

## Dependencies

See `package.json` for full list. Key dependencies:
- `selenium-webdriver`: Browser automation
- `chromedriver`: Chrome driver for Selenium
- `moment`: Date manipulation
- `axios`: HTTP requests

## Output

The script logs detailed progress:
- Login status
- Date checking frequency
- Found dates with comparison to current
- Reschedule attempts and results
- Success/error messages

## Exit Codes

- `0`: Successful reschedule or clean exit
- `1`: Error occurred during execution
- `130`: Interrupted by user (Ctrl+C)
