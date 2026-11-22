# Open Notice

A public notice, read once and turned into dates.

Open Notice is a small **open agentic website**: a page that publishes a portable agent
network as JSON and runs it in the visitor's browser with the visitor's own model key.
The assistant reads the notices on the desk, explains what each one asks for, and turns a
closing date into a dated checklist that can be exported to a calendar.

- Spec: https://github.com/cognizant-ai-labs/agentic-web (Worldwide Agentic Web MVP 0.3)
- Runtime: the reference static runtime, unmodified, in `runtime/`
- Network: `notice_desk.network.json`, built from `notice_desk.hocon`
- Actions: `site-actions.js` (wraps the page's own functions in `script.js`)

## Run locally

```sh
node <agentify-website>/scripts/serve_site.mjs . --port 8080
```

`serve_site.mjs` sends the CORS header the public files need, so another site can fetch
`agent-manifest.json` and the network. `python3 -m http.server` does not.

## Tests

```sh
node --test "tests/notice.test.mjs"
```

## What is sample data

All three notices are marked `SAMPLE` with simplified amounts. They are reading material,
not official publications, and nothing on this site files an application.

## License

MIT for this site's own files. `runtime/` keeps its own license (`runtime/LICENSE.txt`).
