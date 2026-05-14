# Betty — CS Agent Simulation

A live chat simulation tool for screening CS Agent candidates. Candidates play the agent; Claude plays a difficult Betty customer. Results are scored and sent to Google Sheets.

---

## Deploying to Netlify (5 minutes)

### Step 1 — Upload the folder
1. Go to [netlify.com](https://netlify.com) and log in
2. Click **Add new site → Deploy manually**
3. Drag and drop the entire `betty-screening` folder onto the page
4. Netlify will give you a URL immediately (e.g. `https://random-name.netlify.app`)

### Step 2 — Add your API key
1. In Netlify, go to **Site configuration → Environment variables**
2. Click **Add a variable**
3. Key: `ANTHROPIC_API_KEY`
4. Value: your Anthropic API key (get one at console.anthropic.com)
5. Click **Save**
6. Go to **Deploys → Trigger deploy → Deploy site** to apply the variable

### Step 3 — Share the link
Send the Netlify URL to candidates. That's it.

---

## How it works

1. Candidate enters their name
2. They see a briefing: what Betty is, what CS Agents do, and their specific scenario
3. They chat with Claude (playing a difficult customer) for as long as needed
4. They click "End chat" → Claude scores their performance across 6 dimensions
5. Results can be sent to Google Sheets with one click

## Scenarios (randomly assigned per session)
- Quebec player — geo block confusion (deposited but can't play, wants money back)
- Expired bingo tickets — policy dispute (won tickets, they expired, wants compensation)
- VIP player — cashback confusion + months of missed promos
- Angry player — bonus request ignored for 3 weeks, threatening to leave

## Scoring dimensions
- Greeting & tone
- Empathy & warmth
- Policy knowledge
- De-escalation
- Clarity of communication
- Resolution effectiveness

Verdict thresholds: 7+ = proceed, 5-6 = hold, under 5 = decline

---

## Google Sheets export

The export button uses the Anthropic MCP integration with Google Sheets. For this to work, the Anthropic API key used must have Google Sheets MCP access configured. Results are saved to a sheet named **"Betty CS Agent Screening"** in your Google Drive (created automatically on first use).

If the export doesn't work, candidates can screenshot their results instead.

---

## Customising scenarios

Scenarios are defined in `index.html` in the `SCENARIOS` array. Each has:
- `label` — short name shown in the briefing
- `preview` — description shown to the candidate before they start
- `customerName` / `initials` — the fake customer's identity
- `opening` — their first message
- `systemPrompt` — full character brief for Claude (controls how difficult/cooperative the customer is)
