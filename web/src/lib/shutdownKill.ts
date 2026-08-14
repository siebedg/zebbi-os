/** After a one-time Windows protocol install, the site can open zebbi://kill. */

export const KILL_PROTOCOL = 'zebbi://kill'
export const KILL_INSTALLER_PATH = '/Zebbi-install-kill.bat'

export function launchKillHelper(): void {
  window.location.assign(KILL_PROTOCOL)
}
