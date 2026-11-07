# Brain unlock note

This is a design for a private unlock note. It is not running. Nothing in this folder is deployed, and the Pages workflow only uploads `site/`.

`/brain/` is a static page. It cannot learn the visitor's address, and it cannot send mail, without a server the visitor actually connects to. The page's notify switch is off (`UNLOCK_ENABLED` in `site/brain/unlock-client.js`). With that switch off it does not call `fetch`, and it has no endpoint and no key.

## What the page can know

A completion ping, built in the browser, may carry:

- a random session id and a random event id
- how long the successful key entry took, in milliseconds
- language, timezone, and viewport width and height
- a coarse browser family and mobile or desktop, from the user agent
- the referrer origin and path, with the query and hash removed
- the page path

It must not carry a raw user agent, a position, a fingerprint, credentials, note text, or an address. The game can be driven from the console. A ping is not proof that a person finished the wave.

## What only a server can add

`handler.mjs` is the shape of that server. It stays off unless `enabled` is set true in `config.mjs`.

- Time is the server clock.
- The address is the connection's peer address. `X-Forwarded-For` is ignored unless `trustProxy` is true and that peer is listed in `trustedProxies`. Both are off.
- `ipLocation` is null. A later host can fill a country or region from its own table. This code does not call a location service, and it does not take a GPS reading.
- The mail switch is a second flag, `email`, also off. There is no mail library and no key in the repo. A host would pass its own mailer. The recipient is `config.recipient`, not a field the browser can set, and not a new line on the site.
- The HTTP response is `body` only. `body` has no address. `record` is for the host. Do not print it.

## Limits

- One note per session id.
- Five requests an hour for an address, then 429.
- Body cap 2048 bytes. JSON only. Unknown fields are rejected, including `ip`, `ua`, `gps`, `note`, and a client-supplied recipient.
- `Origin` must be on `allowedOrigins`.
- A failed payload does not send mail. Mail without an injected mailer returns 503 and does not fall through to anything else.
- Keep a note 14 days (`retentionDays`), then delete it. Only the site owner should be able to read the mailbox or the store. There is no public log.

## Before turning it on

Show the disclosure line on `/brain/` before someone plays. `disclosureNeeded` is true only when the page switch is on. Do not turn the switches on in this repo until a host exists. Do not put a key, a mail password, or a public log in the site.
