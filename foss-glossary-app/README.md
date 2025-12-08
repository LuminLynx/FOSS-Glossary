# FOSS Glossary App

This is a [Next.js](https://nextjs.org) application with secure GitHub authentication, serving as the foundation for the FOSS Glossary PWA.

## Overview

This Next.js application replaces the previous static PWA implementation, providing:

- Server-side rendering capabilities
- Secure GitHub OAuth authentication via NextAuth.js
- Backend API support for AI integrations
- TypeScript for type safety
- Tailwind CSS for styling

## Tech Stack

- **Framework**: Next.js (Pages Router)
- **Authentication**: NextAuth.js with GitHub Provider
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- GitHub OAuth Application credentials

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root of the `foss-glossary-app` directory:

```bash
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here
```

### 3. Set Up GitHub OAuth Application

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: FOSS Glossary (or your preferred name)
   - **Homepage URL**: `http://localhost:3000` (for local development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and **Client Secret** to your `.env.local` file

### 4. Generate NextAuth Secret

Generate a secure random string for `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

Copy the output to your `.env.local` file.

## Running the Application

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
foss-glossary-app/
├── pages/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth].js   # NextAuth configuration
│   ├── _app.tsx                    # App wrapper with SessionProvider
│   ├── _document.tsx               # Custom Document
│   └── index.tsx                   # Home page with login/logout UI
├── public/                         # Static assets
├── styles/
│   └── globals.css                 # Global styles
├── .env.local                      # Environment variables (not committed)
├── next.config.ts                  # Next.js configuration
├── package.json                    # Dependencies
└── tsconfig.json                   # TypeScript configuration
```

## Features

### Authentication

- **Sign in with GitHub**: Users can authenticate using their GitHub account
- **Session management**: User sessions are managed by NextAuth.js
- **Protected routes**: Easy to add protected API routes and pages

### User Interface

The home page (`pages/index.tsx`) displays:

- User's email when signed in
- "Sign out" button when authenticated
- "Sign in with GitHub" button when not authenticated

## Development

### Linting

The project follows the FOSS Glossary repository's linting standards:

```bash
# From the repository root
npm run lint
npm run format
```

### Type Checking

```bash
npm run build
```

This runs TypeScript compilation and checks for type errors.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `NEXTAUTH_URL` (set to your production URL)
   - `NEXTAUTH_SECRET`
4. Update GitHub OAuth App callback URL to your Vercel deployment URL

## Next Steps

- [ ] Integrate with existing FOSS Glossary data (`terms.json`)
- [ ] Add user profile management
- [ ] Implement AI-powered features
- [ ] Add more authentication providers (optional)
- [ ] Create protected API routes for server-side operations

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)

## License

This project is part of the FOSS Glossary repository and follows the same license (CC0).
