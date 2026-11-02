# Two-minute demo script

Rehearsed against the local app on 2 November 2026, starting from **Reset demo**. Backup screenshots for every step are in [`screenshots/demo/`](screenshots/demo/); use them if the live app is unavailable.

Before presenting: run `./start.sh` (or `start.bat`), open the app, click **Reset demo → Yes, reset**, and stay on the Marketplace tab as CedarWorks.

| Time | Do | Say | Backup |
|---|---|---|---|
| 0:00–0:20 | Point at the amber notice. | "Factories throw away sawdust, cotton offcuts and cardboard that another business could use. Symbio matches them. Everything here is fictional and stored in this browser." | [01](screenshots/demo/01-marketplace.jpg) |
| 0:20–0:45 | As CedarWorks: **+ Add listing** → Sawdust, Peenya, 800 kg, ₹1.5/kg, tick the declaration → **Publish listing**. | "A supplier lists surplus in seconds. Cleanliness is a self-declaration, not verified." | [02](screenshots/demo/02-add-listing.jpg) |
| 0:45–1:15 | **Matches** tab → **PanelLoop**. | "PanelLoop needs 600 kg of sawdust within 50 km. Only exact-material lots that meet its minimum and radius appear: score, coverage and approximate straight-line distance. The 50 kg lot is excluded." | [03](screenshots/demo/03-panelloop-matches.jpg) |
| 1:15–1:35 | **Send enquiry** on the ₹1,200 card, then switch profile to CedarWorks → **Enquiries**. | "The enquiry is saved once; it doesn't reserve stock. The supplier sees it after switching profile." | [04](screenshots/demo/04-enquiry-sent.jpg), [05](screenshots/demo/05-supplier-enquiry.jpg) |
| 1:35–1:50 | **Record demo reuse** → 600 kg, tick the acknowledgement → **Save demo reuse** → **Carbon impact**. | "Only explicitly recorded reuse counts: 600 kg gives 240 kgCO₂e under an invented, clearly labelled 0.4 factor. No offsets are claimed." | [06](screenshots/demo/06-carbon-dashboard.jpg) |
| 1:50–2:00 | Refresh the page. | "Everything persists in this browser. Shared accounts and a database are the next iteration." | — |

## Talking points if asked

- **Why browser-local?** It keeps the prototype dependency-free. Each visitor (and each deployed URL) gets its own copy; nothing syncs across devices.
- **Is profile switching a login?** No. It's a demo story, not access control.
- **Is the carbon number real?** No. The factor is invented for illustration; real reporting needs confirmed transfers and reviewed factors.
- **Ties at 99/100?** Equal scores sort by distance, then listing ID, so ordering is deterministic.
