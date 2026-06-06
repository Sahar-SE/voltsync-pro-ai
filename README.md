# VoltSync Pro AI

VoltSync Pro AI is a futuristic smart grid simulation dashboard built with Next.js. It combines real-time grid monitoring, interactive power sector controls, and browser-based AI forecasting for a complete energy system demo.

## Live demo

https://voltsync-pro-ai.vercel.app/

## What it does

- Simulates a power grid with multiple energy sources and demand sectors.
- Displays live supply vs demand charts and key grid metrics.
- Uses TensorFlow.js to forecast demand in the browser.
- Offers interactive controls for AI mode, auto-simulation, and cycle interval.
- Shows alert conditions when supply or demand stress occurs.

## Features

- Modern **Next.js 15** app-router architecture
- **React 19** + **TypeScript** for a strong UI foundation
- **TensorFlow.js** on-device forecasting
- **Recharts** for dynamic visualization
- Responsive dashboard panels and real-time simulation controls

## Technologies

- Next.js
- React
- TypeScript
- Tailwind CSS
- TensorFlow.js
- Recharts
- Framer Motion
- Lucide React

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

## Build and deploy

```bash
npm run build
npm run start
```

For free deployment, use Vercel or any static-friendly Next.js hosting provider.

## Notes

- The app runs entirely in the browser and does not require a backend.
- AI forecasting is performed locally using TensorFlow.js.
- The demo link above points to the live Vercel deployment.

If you like this project, please give it a ⭐ on GitHub!

## Project structure

- `app/` — page and layout entrypoints
- `components/` — UI widgets and dashboard panels
- `lib/` — grid simulation and forecasting logic
- `public/` — static assets
- `package.json` — dependencies and scripts

