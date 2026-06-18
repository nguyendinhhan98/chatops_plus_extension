# Privacy Policy for ChatOps++

Last updated: June 12, 2026

This Privacy Policy describes how the **ChatOps++** Chrome Extension ("we", "our", or "the Extension") collects, uses, and shares your information.

## 1. Information We Collect and Process

ChatOps++ is designed as a client-side productivity tool for Mattermost. We respect your privacy and only process the minimal amount of data required to provide its features:

* **Mattermost Integration:** The Extension interacts directly with your Mattermost instance hosted at `https://chat.runsystem.vn`. It accesses posts, channels, teams, and user information to display task reminders, scan mentions, and perform searches.
* **Authentication and Cookies:** The Extension syncs your Mattermost session cookies to authenticate API requests directly to your Mattermost server. This data is handled securely via the `chrome.cookies` API and is never transmitted to any external servers.
* **Local Storage:** All user configuration, settings, task lists, memos, and custom images are stored locally on your device via the `chrome.storage.local` and `chrome.storage.sync` APIs.

## 2. Third-Party Services

We do not sell, trade, or transfer your data to outside parties. Data is only sent to:
* Your company's Mattermost server (`https://chat.runsystem.vn`).

## 3. Data Retention

All data managed by the Extension (memos, settings, tasks) is stored locally on your machine. You can clear this data at any time by:
1. Clearing the Extension data via Settings.
2. Uninstalling the Extension.

## 4. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date of this Privacy Policy.

## 5. Contact Us

If you have questions or suggestions about this Privacy Policy, please contact the developer or open an issue on the project repository.
