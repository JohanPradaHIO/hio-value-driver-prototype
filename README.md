# Mining Driver Tree Model - Review Copy

This folder is a copy of `../value-driver-ui-v3/` prepared for Johan to review before deciding whether a public/GitHub version should be created.

## Disclaimer

This is a prototype review copy only.

Any public or demo release must treat the data as dummy or synthetic sample data. The prototype must not be interpreted as official operational, financial, planning, production, mine performance or reporting output.

Do not publish this folder externally until the data package has been replaced with a reviewed public-safe package and Johan has approved the upload.

## What Changed From V3

- The application files were copied from `prototypes/value-driver-ui-v3/`.
- `app.js` was left unchanged.
- A visible review disclaimer was added to `index.html`.
- Minimal CSS was added for the disclaimer banner.
- This README was added to document the review/publication caveat.

## Run Locally

From the `prototypes` folder:

```powershell
python -m http.server 8000
```

Open:

```text
http://localhost:8000/value-driver-ui-v3-github/
```

## Publication Checklist

- Replace any real or internal data package with dummy/synthetic sample data.
- Confirm no internal table names, paths, tokens, secrets, hostnames or non-public source names are exposed.
- Confirm labels, screenshots and README wording are acceptable for external viewing.
- Get Johan approval before uploading anywhere.
