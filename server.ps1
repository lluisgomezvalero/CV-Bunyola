$port = 3000
$folder = "C:\Users\mmval\.gemini\antigravity\scratch\volleyball-management-app"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

$listener.Start()
Write-Host "Servidor web activo en http://localhost:$port/"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $response.AddHeader("Access-Control-Allow-Origin", "*")

        $rawPath = $request.Url.AbsolutePath
        if ($rawPath -eq "/") { $rawPath = "/index.html" }
        $localFilePath = Join-Path $folder $rawPath.TrimStart('/')

        if (Test-Path $localFilePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localFilePath)
            $ext = [System.IO.Path]::GetExtension($localFilePath).ToLower()
            if ($ext -eq ".html") { $response.ContentType = "text/html; charset=utf-8" }
            elseif ($ext -eq ".css")  { $response.ContentType = "text/css" }
            elseif ($ext -eq ".js")   { $response.ContentType = "application/javascript" }
            elseif ($ext -eq ".jpg")  { $response.ContentType = "image/jpeg" }
            elseif ($ext -eq ".png")  { $response.ContentType = "image/png" }
            else { $response.ContentType = "application/octet-stream" }

            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.OutputStream.Close()
    } catch {
        # ignorar
    }
}
