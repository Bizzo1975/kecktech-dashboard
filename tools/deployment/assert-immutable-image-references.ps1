[CmdletBinding()]
param(
    [Parameter(Mandatory, ValueFromPipeline)]
    [ValidateNotNullOrEmpty()]
    [string[]]$ImageReference
)

begin {
    $ErrorActionPreference = 'Stop'
    $invalid = [System.Collections.Generic.List[string]]::new()
}

process {
    foreach ($reference in $ImageReference) {
        if ($reference -notmatch '^[a-zA-Z0-9._/-]+(?::[a-zA-Z0-9._-]+)?@sha256:[a-fA-F0-9]{64}$') {
            $invalid.Add($reference)
        }
    }
}

end {
    if ($invalid.Count -gt 0) {
        $invalid | ForEach-Object { Write-Output "NON-IMMUTABLE IMAGE: $_" }
        throw 'Every deployment image must be an OCI name pinned by SHA-256 digest.'
    }

    Write-Output "Immutable image validation passed: $($ImageReference.Count) reference(s)."
}
