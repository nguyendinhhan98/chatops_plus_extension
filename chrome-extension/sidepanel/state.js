/**
 * Workspace State Management — Chrome Extension Sidepanel
 */

let _currentTeam = null;
let _currentUser = null;
let _cachedConfig = null;

export const state = {
  getTeam: () => _currentTeam,
  setTeam: (team) => { _currentTeam = team; },
  
  getUser: () => _currentUser,
  setUser: (user) => { _currentUser = user; },
  
  getConfig: () => _cachedConfig,
  setConfig: (config) => { _cachedConfig = config; },
  
  /**
   * Reset state when changing workspace
   */
  reset: () => {
    // We don't reset currentUser/cachedConfig as they are global
    // Only currentTeam changes frequently in the UI
  }
};
