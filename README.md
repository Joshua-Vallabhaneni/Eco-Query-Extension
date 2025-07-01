AI Energy Awareness
======================

A Chrome extension that shows how much energy (and CO₂) your AI queries cost — before you hit "Send".

Why you might care
------------------
* Quick green score (1-6) so you can pick the lighter option.
* See that simple stuff is usually cheaper on Google.
* Spot heavyweight prompts that make GPT burn extra juice.

Install in 30 seconds
--------------------
1. Download / clone this repo.
2. In Chrome, open `chrome://extensions` and flick **Developer mode** on.
3. Click **Load unpacked** → select the `ai-energy-awareness-extension` folder.
4. Refresh ChatGPT/Google and you're set.

How it works (short version)
----------------------------
* Google: ~0.3 Wh each search.
* ChatGPT: 0.3 Wh + a bit per token (guessed from research).
* We look at your prompt length / type to guess tokens.
* We nudge numbers down when the grid is greener (10 am – 4 pm solar).

Take it as an *estimate*, not a life-cycle audit.

Using it
--------
1. Write your prompt in ChatGPT (or type in Google).
2. A pop-up shows: Wh, grams of CO₂, and the 1-6 eco score.
3. Curious? Expand "How was this calculated?" for the nerdy bits.
4. Click **Use Google** or **Use ChatGPT** — up to you.

License
-------
MIT. 