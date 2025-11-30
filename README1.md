# PigMint - Smart Savings Application

A personal finance application that helps users save money through automated rules and goal tracking.

## Project info

**URL**: https://lovable.dev/projects/11caf897-701c-45dd-bdc9-c83d2da71e8c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/11caf897-701c-45dd-bdc9-c83d2da71e8c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Features

- **Dashboard**: View spending summaries, savings progress, and personalized recommendations
- **Transactions**: Track all your financial transactions with categorization and search
- **Goals**: Create and monitor savings goals with progress tracking
- **Rules**: Automated savings rules including round-up functionality
- **Reports**: Generate detailed spending reports filtered by date range
- **Profile**: Manage user profile and account settings

## Architecture

The application uses a hybrid architecture:

- **Frontend**: React with TypeScript, using Vite for fast development
- **Backend**: GCP-based API for transaction processing and data management
- **Database**: Supabase for authentication and data persistence

### Backend Integration

The app connects to a GCP backend API that handles:
- Transaction management and processing
- Savings rules engine
- Goal tracking and updates
- Spending analytics and reports

The backend API endpoint is configured via `VITE_BACKEND_API_URL` environment variable.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (authentication and database)
- React Query (data fetching)
- Recharts (data visualization)

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/11caf897-701c-45dd-bdc9-c83d2da71e8c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
