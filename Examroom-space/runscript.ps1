docker compse down -v
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location .\Backend
docker build -t local/backend:fixed .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location ..

Set-Location .\Fontend
docker build -t local/frontend:fixed .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location ..
docker-compose up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }