# Build and Package Instructions

This guide explains how to build and package the GoLogin Automation app for distribution to your team.

## Step 1: Build the Application

Run the following command in your project directory:

\`\`\`bash
npm run build
\`\`\`

This will create a standalone build in the `.next/standalone` folder.

## Step 2: Prepare the Distribution Package

### On Windows (PowerShell):

```powershell
# Create distribution folder
New-Item -ItemType Directory -Force -Path "dist"

# Copy standalone build
Copy-Item -Recurse -Force ".next/standalone/*" "dist/"

# Copy static files
Copy-Item -Recurse -Force ".next/static" "dist/.next/static"
Copy-Item -Recurse -Force "public" "dist/public"

# Copy startup scripts
Copy-Item "start.bat" "dist/"
Copy-Item "start.sh" "dist/"

# Copy documentation
Copy-Item "DISTRIBUTION_README.md" "dist/README.md"

# Create server.js
@"
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port, dir: __dirname })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, (err) => {
    if (err) throw err
    console.log('> Ready on http://localhost:' + port)
  })
})
"@ | Out-File -FilePath "dist/server.js" -Encoding utf8

# Create .env.local template
@"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# GoLogin Configuration
GOLOGIN_API_KEY=your_gologin_api_key_here

# Development redirect URL (for local testing)
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
"@ | Out-File -FilePath "dist/.env.local.example" -Encoding utf8

Write-Host "Package created in 'dist' folder!"
Write-Host "Next steps:"
Write-Host "1. Copy your actual .env.local file to the dist folder"
Write-Host "2. Zip the 'dist' folder"
Write-Host "3. Share the zip file with your team"
