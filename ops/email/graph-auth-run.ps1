$ErrorActionPreference = "Continue"
Import-Module Microsoft.Graph.Identity.DirectoryManagement
"START $(Get-Date -Format o)" | Out-File -FilePath "F:\Github\kecktech-dashboard\ops\email\graph-auth.log"
try {
  Connect-MgGraph -Scopes "Domain.ReadWrite.All","Directory.ReadWrite.All" -UseDeviceCode -NoWelcome *>&1 | Tee-Object -FilePath "F:\Github\kecktech-dashboard\ops\email\graph-auth.log" -Append
  "CONNECTED account=$((Get-MgContext).Account) tenant=$((Get-MgContext).TenantId)" | Tee-Object -FilePath "F:\Github\kecktech-dashboard\ops\email\graph-auth.log" -Append
  Get-MgDomain | Format-Table Id, IsVerified, IsDefault | Out-String | Tee-Object -FilePath "F:\Github\kecktech-dashboard\ops\email\graph-auth.log" -Append
} catch {
  "ERROR: $_" | Tee-Object -FilePath "F:\Github\kecktech-dashboard\ops\email\graph-auth.log" -Append
}
