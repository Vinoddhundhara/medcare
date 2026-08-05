# ============================================================
#  MedCare - Local PostgreSQL Setup Script
#  Run this script as Administrator in PowerShell
#  Usage: .\scripts\setup-local-db.ps1
# ============================================================

$PG_BIN  = "C:\Program Files\PostgreSQL\18\bin"
$PG_DATA = "C:\Program Files\PostgreSQL\18\data"
$PG_PORT = "5433"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MedCare Local Database Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Ask for postgres superuser password
$pgPass = Read-Host "Enter your PostgreSQL 'postgres' superuser password" -AsSecureString
$pgPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPass)
)

$env:PGPASSWORD = $pgPassPlain

# Step 2: Test connection
Write-Host "`nTesting connection to PostgreSQL on port $PG_PORT..." -ForegroundColor Yellow
$test = & "$PG_BIN\psql.exe" -U postgres -p $PG_PORT -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not connect. Check your password and try again." -ForegroundColor Red
    Write-Host $test
    exit 1
}
Write-Host "Connected successfully!" -ForegroundColor Green

# Step 3: Create user and database
Write-Host "`nCreating 'medcare' user and database..." -ForegroundColor Yellow

& "$PG_BIN\psql.exe" -U postgres -p $PG_PORT -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medcare') THEN CREATE USER medcare WITH PASSWORD 'medcare'; END IF; END `$`$;" 2>&1
& "$PG_BIN\psql.exe" -U postgres -p $PG_PORT -c "SELECT 1 FROM pg_database WHERE datname = 'medcare';" | Out-Null
$dbExists = & "$PG_BIN\psql.exe" -U postgres -p $PG_PORT -tc "SELECT 1 FROM pg_database WHERE datname = 'medcare';" 2>&1
if ($dbExists -match "1") {
    Write-Host "Database 'medcare' already exists, skipping creation." -ForegroundColor Yellow
} else {
    & "$PG_BIN\psql.exe" -U postgres -p $PG_PORT -c "CREATE DATABASE medcare OWNER medcare;" 2>&1
    Write-Host "Database 'medcare' created!" -ForegroundColor Green
}

& "$PG_BIN\psql.exe" -U postgres -p $PG_PORT -c "GRANT ALL PRIVILEGES ON DATABASE medcare TO medcare;" 2>&1

Write-Host "`nDone! Database setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run schema push:   npm run db:push" -ForegroundColor White
Write-Host "  2. Start the app:     npm run dev" -ForegroundColor White
Write-Host ""

$env:PGPASSWORD = ""
