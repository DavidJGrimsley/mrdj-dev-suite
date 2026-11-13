# Napoleon Hill handwriting assets

NapoleonHillPrint.ttf / .woff2 map A–Z, digits 0–7 and 9, space and selected punctuation. Digit 8, lowercase and ! ? ( ) & / + $ % @ # * are unresolved. V and Q are user-directed reconstructions from W and C/G references. V preserves a traced W-valley contour; 0 is an authentic thinner HW7 10 CARDS numeral. Em dash is reconstructed by widening a thin HW8 dash. 45 mapped characters: 37 extracted, 7 reconstructed, 1 metric space. See provenance.json.

NapoleonHillSignature.ttf / .woff2 map the complete HW5 autograph to U+E000. napoleon-hill-signature.svg is its outline; napoleon-hill-signature.strokes.json is a separate Tegaki reference with an inferred chronological left-to-right cursive pen order (continuous Napoleon through H's left stem, lift inside H to the right spire through i-l-l, lift for the detached i dot, lift for the terminal dash). It is not recorded historical handwriting motion.

Use `font-family: 'Napoleon Hill Print'` after registering the WOFF2 with @font-face. For the signature use the signature face and the character `\uE000` (HTML `&#xE000;`). No lowercase substitution is built in; uppercase text explicitly when appropriate.

The verified i² workspace sibling `generated/napoleon-hill-handwriting/` holds editable SVGs, UFO font sources, retained original V/Q/0/dash crops, the full pipeline, source hashes, comparison sheets and validation reports. Run its `.venv/Scripts/python.exe scripts/run_all.py` to regenerate. Source photographs stay outside the repository. No animation scene is included.
