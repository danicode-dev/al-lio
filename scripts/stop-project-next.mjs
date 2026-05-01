import { execFileSync } from "node:child_process";
import { platform } from "node:os";

const cwd = process.cwd();
const selfPid = process.pid;

function runWindows() {
  const escapedCwd = cwd.replace(/'/g, "''");
  const command = `
$cwd = '${escapedCwd}'
$escaped = [regex]::Escape($cwd)
$self = ${selfPid}
$nextProcesses = Get-CimInstance Win32_Process | Where-Object {
  $_.ProcessId -ne $self -and
  $_.CommandLine -and
  $_.CommandLine -match 'next' -and
  $_.Name -match 'node'
}
$projectItems = $nextProcesses | Where-Object { $_.CommandLine -match $escaped }
$portPids = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -ge 3000 -and $_.LocalPort -le 3999 } |
  Select-Object -ExpandProperty OwningProcess -Unique
$portItems = $nextProcesses | Where-Object { $portPids -contains $_.ProcessId }
$items = @($projectItems + $portItems) | Sort-Object ProcessId -Unique
foreach ($item in $items) {
  Stop-Process -Id $item.ProcessId -Force -ErrorAction SilentlyContinue
  Write-Output "Stopped PID $($item.ProcessId)"
}
if (-not $items) { Write-Output 'OK: no habia procesos Next de este proyecto.' }
`;
  process.stdout.write(execFileSync("powershell", ["-NoProfile", "-Command", command], { encoding: "utf8" }));
}

function runPosix() {
  const output = execFileSync("ps", ["-eo", "pid=,args="], { encoding: "utf8" });
  const matches = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.*)$/);
      return match ? { pid: Number(match[1]), args: match[2] } : null;
    })
    .filter((item) => item && item.pid !== selfPid && item.args.includes(cwd) && item.args.includes("next"));

  for (const item of matches) {
    try {
      process.kill(item.pid, "SIGTERM");
      console.log(`Stopped PID ${item.pid}`);
    } catch {
      // Process may have already exited.
    }
  }

  if (!matches.length) console.log("OK: no habia procesos Next de este proyecto.");
}

if (platform() === "win32") runWindows();
else runPosix();
