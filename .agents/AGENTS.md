# Verification Standards for Hosflow

This codebase has a history of silent fallback bugs, "offline-first" mocked services masquerading as real endpoints, and hardcoded success messages that do not reflect actual branch execution. To maintain integrity, apply the following rigorous verification standards to all work in this repository:

## 1. Do Not Trust the Absence of `MOCK_` Imports
When auditing or wiring up a view, do not assume that removing `MOCK_DATA` imports is sufficient. 
- **Check for Silent Fallbacks:** Grep for the fallback operators (e.g., `data ?? MOCK_DATA` or `data.length > 0 ? data : MOCK_DATA`).
- **Check for Fake Services:** Verify that the service layer isn't using `localStorage` to emulate a backend (e.g., `hospitalManagementService`, `dischargeNotificationService`).
- **Check for Hardcoded State:** Ensure component states like `useState([...])` do not contain hardcoded demo data that ignores API responses.

## 2. Verify Both Read and Write Paths
Never assume a feature is "done" just because the `POST` request compiles or returns 200.
- **Write Path:** The action must persist to Postgres.
- **Read Path:** The corresponding UI view must actually read from Postgres, NOT from a local cache or a discarded API response.

## 3. Post Raw Output for Safety & Financial Features
For any feature that touches **patient safety** (e.g., narcotic dispensing, kill switches, clinical notes) or **financial correctness** (e.g., billing, invoicing):
- **Do not use narrative summaries** to prove it works. 
- **Paste raw HTTP request/response output** (status codes, JSON bodies) directly into the conversation.
- **Verify Branch Logic:** Ensure that the API response dynamic messages accurately reflect the specific logical branch executed, rather than relying on a static "success" string that could mask a bypassed check.

## 4. Triage and Explicit Labeling
Not every fake service must be rewritten to hit the database immediately, but ambiguous scope is dangerous. 
- **Label Demos Explicitly:** If a view or component (e.g., Executive Dashboards) is consciously left to use mock data or `localStorage` for now, it must be explicitly labeled as "Demo" or "Offline" directly in the UI. 
- **Never Fake Reality:** Do not allow mocked components to use terminology like "Live", "Synced", or "Real-time". If it's a demo, the user interface must reflect that truth.
