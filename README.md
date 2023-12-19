# Purpose of the app

This extension enhances the time tracking software Clockify. While Clockify, being an American company, does not offer assistance with compliance to German break rules and work hour regulations, this app fills that gap. It effectively monitors your time entries, alerting you to any discrepancies or anomalies in accordance with German labor laws regarding working hours and break periods.

## Setup

To setup the app you have to create a ```.env``` file in the root of this project. It should contain the ```API_KEY``` to your Clockify Account. You can generate an API Key at https://app.clockify.me/user/settings.

```env
API_KEY=123456789abcdefghijklmnopqrstuvwxyz
```

Now you can start the project in development mode. Make sure never to expose your API Key to strangers, as they can manipulate and read everything from your Clockify Account.

## Development

From your terminal:

```sh
npm run dev
```

This starts your app in development mode, rebuilding assets on file changes.

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `remix build`

- `build/`
- `public/build/`
