/**
 * Workspace State Management — ChatOps Chrome Extension Sidepanel
 */

let _currentTeam = null;
let _currentUser = null;
let _cachedConfig = null;
let _teams = [];

export const state = {
  getTeam: () => _currentTeam,
  setTeam: (team) => { _currentTeam = team; },
  
  getTeams: () => _teams,
  setTeams: (teams) => { _teams = teams || []; },
  
  getUser: () => _currentUser,
  setUser: (user) => { _currentUser = user; },
  
  getConfig: () => _cachedConfig,
  setConfig: (config) => { _cachedConfig = config; },
  
  /**
   * Reset state when changing workspace
   */
  reset: () => {
    // Note: We don't reset currentUser/cachedConfig as they are global to the session
    // Only currentTeam usually changes during a workspace switch
  }
};
