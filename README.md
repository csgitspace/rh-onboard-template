# StaffFlow (template)

A Google Apps Script web app for running a multi-step approval workflow backed by a Google Sheet. It was built for staff onboarding and is shared here as a starting point for similar workflows (for example, permission slips).

Staff names and emails have been replaced with placeholders. Search for `example.org` and `Name` to find the spots to update.

## What's in it

- `Setup.js`: creates the backing spreadsheet; defines the roles, task steps and dependencies
- `Code.js`: data access and the workflow engine (request records, task state, step dependencies)
- `WebApp.js`: `doGet` and the functions the web page calls
- `Admin.js`: role checks and the workflow editor
- `Notify.js`: email notifications, reminders and the welcome message
- `Index.html`: the web app UI
- `WelcomeEmail.html`: HTML email template

## Getting started

1. Create a new Apps Script project at script.google.com, or use [clasp](https://github.com/google/clasp) and run `clasp create`.
2. Copy these files in.
3. Run the setup function in `Setup.js` to create the spreadsheet.
4. Deploy as a web app (Execute as: Me; Who has access: anyone in your domain).
